import { NextResponse } from "next/server";
import { CLAUDE_API_URL } from "@/lib/claude-api-constants";

interface RepoChatRequestBody {
  question: string;
  name: string;
  description: string | null;
  techStack: string[];
  fileTree: string[];
  entrypoints?: string[];
  fileContents?: Record<string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RepoChatRequestBody;
    const { question, name, description, techStack, fileTree, entrypoints, fileContents } = body;

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
            : entrypoints?.length
            ? `This repository, ${name}, does not provide a rich description in its metadata. Main entry points: ${entrypoints.slice(0, 5).join(", ")}. Inspect the README and these entrypoints to understand what it does.`
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
        lowerQuestion.includes("entry point") ||
        (lowerQuestion.includes("architecture") && !lowerQuestion.includes("explain"))
      ) {
        const candidates = entrypoints?.length ? entrypoints : fileTree.filter((p) =>
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
            candidates.slice(0, 12).map((p) => `- ${p}`).join("\n");
        } else {
          answer =
            "No standard entry files were found (such as app/page.tsx, src/App.tsx, server.js, index.js, main.py, or app.py). Start from the README and the most central src/ modules to locate the main execution flow.";
        }
      } else if (
        (lowerQuestion.includes("explain") && lowerQuestion.includes("architecture")) ||
        lowerQuestion.includes("how is this structured")
      ) {
        const apiPaths = fileTree.filter(
          (p) =>
            p.startsWith("app/api") ||
            p.startsWith("pages/api") ||
            p.includes("/api/") ||
            p.includes("routes/") ||
            p.includes("controllers/")
        );
        const frontPaths = fileTree.filter(
          (p) =>
            p.startsWith("app/") ||
            p.startsWith("pages/") ||
            p.startsWith("src/") &&
            (p.includes("component") || p.endsWith(".tsx") || p.endsWith(".jsx"))
        );
        let arch = "";
        if (entrypoints?.length) {
          arch += "Entry points: " + entrypoints.slice(0, 8).join(", ") + ".\n";
        }
        if (apiPaths.length) arch += "API/routes: " + apiPaths.slice(0, 6).join(", ") + ".\n";
        if (frontPaths.length) arch += "Frontend: " + frontPaths.slice(0, 6).join(", ") + ".";
        answer = arch || `${techLine}. Inspect the file tree and README to understand the architecture.`;
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

        const pkgKey = fileContents && Object.keys(fileContents).find((k) => k.toLowerCase().endsWith("package.json"));
        const pkgContent = pkgKey ? fileContents[pkgKey]?.trim() : undefined;
        if (hasPackageJson && pkgContent) {
          try {
            const pkg = JSON.parse(pkgContent as string) as { scripts?: Record<string, string> };
            const scripts = pkg.scripts ? Object.entries(pkg.scripts).map(([k, v]) => `- ${k}: ${v}`).join("\n") : "";
            answer =
              "This project uses Node.js. From package.json scripts:\n" +
              (scripts || "No scripts listed. Typical: npm install, npm run dev or npm start.");
          } catch {
            answer =
              "This project includes a package.json file. Typical: npm install, npm run dev (or npm start). Inspect the scripts section in package.json for the exact commands.";
          }
        } else if (hasPackageJson) {
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
          `${techLine}\n` +
          (entrypoints?.length ? `Entry points: ${entrypoints.slice(0, 6).join(", ")}\n` : "") +
          "\nSkim the README and main entry files to understand how this repo is structured.";
      }

      return NextResponse.json({ answer });
    }

    // Claude-backed answer when API key is available
    const systemPrompt =
      "You are Repo Copilot, an AI assistant that answers questions about a GitHub repository.\n" +
      "You are given: repository name and description, tech stack, file tree sample, optional entry points, and optional file contents (e.g. package.json, README).\n" +
      "Answer using ONLY this context and common conventions. Use repo metadata, file tree, tech stack, entry points, and file content to give precise, helpful answers.\n" +
      "- Prefer short, direct answers (3–6 sentences) with concrete file or folder references.\n" +
      "- For “how do I run”, use package.json scripts if provided; otherwise point to README or entry files.\n" +
      "- For “where is the API”, use the file tree (e.g. app/api, pages/api, routes/, controllers/).\n" +
      "- For architecture, describe entry points, main modules, and how they connect.\n" +
      "- If something is not knowable from the context, say so and suggest where to look.";

    const fileContentsBlock =
      fileContents && Object.keys(fileContents).length > 0
        ? "\n\nRelevant file contents:\n" +
          Object.entries(fileContents)
            .map(([path, content]) => `--- ${path} ---\n${(content ?? "").slice(0, 8000)}`)
            .join("\n\n")
        : "";
    const entrypointsBlock =
      entrypoints?.length ? `\nEntry points: ${entrypoints.join(", ")}` : "";

    const userPrompt = [
      `Question: ${question}`,
      `Repository: ${name}`,
      description ? `Description: ${description}` : null,
      techLine,
      entrypointsBlock,
      "File tree sample:",
      treeSample,
      fileContentsBlock
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

