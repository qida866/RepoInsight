import { NextResponse } from "next/server";
import { CLAUDE_API_URL } from "@/lib/claude-api-constants";

interface RepoChatRequestBody {
  question: string;
  name: string;
  description: string | null;
  techStack: string[];
  fileTree: string[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RepoChatRequestBody;
    const { question, name, description, techStack, fileTree } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.CLAUDE_API_KEY;

    const treeSample = fileTree.slice(0, 180).join("\n");
    const techLine =
      techStack && techStack.length
        ? `Tech stack: ${techStack.join(", ")}`
        : "Tech stack: unknown";

    // Heuristic fallback when no AI key
    if (!apiKey) {
      const lowerQuestion = question.toLowerCase();

      let answer = "";

      if (lowerQuestion.includes("what") && lowerQuestion.includes("repo")) {
        answer =
          description && description.trim().length > 0
            ? `This repository, ${name}, is described as: ${description}.`
            : `This repository, ${name}, does not provide a rich description in its metadata, but you can inspect the README and main entrypoints to understand what it does.`;
      } else if (
        lowerQuestion.includes("where") &&
        (lowerQuestion.includes("api") || lowerQuestion.includes("endpoint"))
      ) {
        const apiPaths = fileTree.filter(
          (p) =>
            p.startsWith("app/api") ||
            p.startsWith("pages/api") ||
            p.includes("/api/") ||
            p.includes("routes/") ||
            p.includes("controllers/")
        );
        if (apiPaths.length) {
          answer =
            "The API surface appears to live in paths like:\n" +
            apiPaths.slice(0, 8).map((p) => `- ${p}`).join("\n");
        } else {
          answer =
            "No obvious API folders (like app/api, pages/api, routes/, or controllers/) were detected in the file tree. This repo may expose its API via a different convention or be a library rather than a service.";
        }
      } else if (
        lowerQuestion.includes("main logic") ||
        lowerQuestion.includes("main entry") ||
        lowerQuestion.includes("entry point")
      ) {
        const candidates = fileTree.filter((p) =>
          [
            "app/page.tsx",
            "src/App.tsx",
            "server.js",
            "index.js",
            "main.py",
            "app.py"
          ].some((ep) => p.toLowerCase().endsWith(ep.toLowerCase()))
        );

        if (candidates.length) {
          answer =
            "The main logic likely starts in these entry files:\n" +
            candidates.map((p) => `- ${p}`).join("\n");
        } else {
          answer =
            "No standard entry files were found (such as app/page.tsx, src/App.tsx, server.js, index.js, main.py, or app.py). Start from the README and the most central src/ modules to locate the main execution flow.";
        }
      } else if (
        lowerQuestion.includes("how do i run") ||
        lowerQuestion.includes("run this project") ||
        lowerQuestion.includes("start the project")
      ) {
        const hasPackageJson = fileTree.some((p) =>
          p.toLowerCase().endsWith("package.json")
        );
        const hasRequirements = fileTree.some((p) =>
          p.toLowerCase().endsWith("requirements.txt")
        );
        const hasPyproject = fileTree.some((p) =>
          p.toLowerCase().endsWith("pyproject.toml")
        );

        if (hasPackageJson) {
          answer =
            "This project includes a package.json file, so it is likely run with Node.js tooling. Typical commands are:\n" +
            "- Install: npm install or pnpm install\n" +
            "- Dev: npm run dev\n" +
            "- Prod: npm run build && npm start\n" +
            "Inspect the scripts section in package.json for the exact commands.";
        } else if (hasRequirements || hasPyproject) {
          answer =
            "This project appears to be Python-based (requirements.txt or pyproject.toml detected). Typical steps are:\n" +
            "- Create and activate a virtualenv.\n" +
            "- Install dependencies (e.g. pip install -r requirements.txt or use your pyproject.toml tool like poetry/pip-tools).\n" +
            "- Run the main module (often python main.py or python -m package_name). Check README and entry files to confirm.";
        } else {
          answer =
            "Run instructions are not obvious from the file tree alone. Check the README, package.json, or project docs for the canonical way to start the project.";
        }
      } else {
        answer =
          "AI chat is not configured for this deployment, so responses are based on simple heuristics.\n\n" +
          `Repository: ${name}\n` +
          (description ? `Description: ${description}\n` : "") +
          `${techLine}\n\n` +
          "Skim the README and main entry files (such as app/page.tsx, src/App.tsx, server.js, or main.py) to understand how this repo is structured. From there, follow imports into feature folders and data-access code to answer detailed questions.";
      }

      return NextResponse.json({ answer });
    }

    // Claude-backed answer when API key is available
    const systemPrompt =
      "You are RepoInsight Chat, an AI assistant that answers questions about a GitHub repository.\n" +
      "You are given the repository name, description, detected tech stack, and a sample of the file tree.\n" +
      "Answer the developer's question precisely, using ONLY this information and general knowledge of common conventions.\n" +
      "- If the answer depends on scripts or configuration not shown, explain what file they should open (e.g. package.json, README, docker-compose.yml) and what to look for.\n" +
      "- Prefer short, direct answers (3–6 sentences) with concrete file or folder references.\n" +
      "- If something is not knowable from the provided context, say so explicitly and suggest where to look in the repo.";

    const userPrompt = [
      `Question: ${question}`,
      `Repository: ${name}`,
      description ? `Description: ${description}` : null,
      techLine,
      "File tree sample:",
      treeSample
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          error:
            "Failed to get an AI answer for this repo question. " +
            (text || `${res.status} ${res.statusText}`)
        },
        { status: 500 }
      );
    }

    const json = (await res.json()) as any;
    const answer: string = json.content?.[0]?.text ?? "";

    return NextResponse.json({ answer: answer.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Unexpected error in repo chat."
      },
      { status: 500 }
    );
  }
}

