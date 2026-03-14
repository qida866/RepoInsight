import { NextRequest, NextResponse } from "next/server";
import { CLAUDE_API_URL } from "@/lib/claude-api-constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { path, code, repoName, learnMode, intelligenceMode } = (await req.json()) as {
      path?: string;
      code?: string;
      repoName?: string;
      learnMode?: boolean;
      intelligenceMode?: boolean;
    };

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      if (learnMode) {
        return NextResponse.json(
          {
            purpose:
              "This file is part of the repository. Configure CLAUDE_API_KEY to get a beginner-friendly explanation of its purpose and how it fits in the project.",
            keyConcepts: "—",
            architectureRole: "—",
            learnNext: "Set up the API key and click “Explain this file” again to see what to learn next."
          },
          { status: 200 }
        );
      }
      if (intelligenceMode) {
        return NextResponse.json(
          {
            purpose: "Configure CLAUDE_API_KEY to get an AI explanation of this file’s purpose.",
            mainFunctions: "—",
            dependencies: "—",
            architectureRole: "—"
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        {
          summary:
            "AI explanation is unavailable because CLAUDE_API_KEY is not configured.",
          purpose:
            "This panel will describe the purpose, key functions, and how this file connects to the rest of the repo once an API key is set.",
          connections:
            "Configure Claude to see cross-file and architectural relationships here."
        },
        { status: 200 }
      );
    }

    const useLearnPrompt = !!learnMode;
    const useIntelligencePrompt = !!intelligenceMode && !useLearnPrompt;

    const systemPrompt = useLearnPrompt
      ? "You are a friendly coding tutor helping a beginner understand a source file.\n" +
        "Given a single file from a repository, explain it in plain language. You MUST respond in JSON with keys: purpose, keyConcepts, architectureRole, learnNext.\n" +
        "- purpose: 1–2 sentences on what this file is for, in simple terms.\n" +
        "- keyConcepts: 2–4 short bullet points explaining the main ideas or patterns in this file (e.g. “React hooks”, “API route handler”, “database model”).\n" +
        "- architectureRole: 1–2 sentences on how this file fits in the bigger picture (e.g. “This is the API layer that the frontend calls” or “This defines the data shape used by the services”).\n" +
        "- learnNext: 1–2 concrete suggestions for what to read or try next to understand the codebase (e.g. “Open the service that imports this” or “Read the README section on authentication”)."
      : useIntelligencePrompt
      ? "You are an expert at analyzing source code for repository navigation.\n" +
        "Given a file path and its contents, produce a structured explanation. Respond ONLY with valid JSON with exactly these keys: purpose, mainFunctions, dependencies, architectureRole.\n\n" +
        "- purpose: 2–4 sentences on what this file is for: its primary responsibility and why it exists in the codebase.\n" +
        "- mainFunctions: bullet-style list of the main functions, components, classes, or exports (name and one-line description each). Be specific.\n" +
        "- dependencies: key imports (external packages and notable local modules) and, if evident, what might depend on this file.\n" +
        "- architectureRole: how this file fits in the architecture (e.g. API route handler, service layer, UI component, data model, config, middleware). One or two sentences."
      : "You are an AI code reviewer in a repository understanding tool.\n" +
        "Given a single source file, explain it to a senior engineer. You MUST respond in JSON with keys: summary, purpose, mainFunctions, connections.\n" +
        "- summary: one-sentence description of what this file does.\n" +
        "- purpose: 2-3 sentences on the role this file plays in the codebase.\n" +
        "- mainFunctions: short bullet-style description of the main functions, components, or classes in this file.\n" +
        "- connections: how this file likely connects to other parts of the repo (APIs, services, UI, database, etc.).";

    const userPrompt = [
      repoName ? `Repository: ${repoName}` : null,
      path ? `File path: ${path}` : null,
      "File contents:",
      code
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
        max_tokens: useIntelligencePrompt ? 1200 : 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API error: ${res.status} ${text}`);
    }

    const json = (await res.json()) as any;
    const text: string = json.content?.[0]?.text ?? "";

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(text);
    } catch {
      if (useLearnPrompt) {
        parsed = {
          purpose: text.slice(0, 300) || "Could not parse explanation.",
          keyConcepts: "—",
          architectureRole: "—",
          learnNext: "Try opening another file or re-run the explanation."
        };
      } else if (useIntelligencePrompt) {
        parsed = {
          purpose: text.slice(0, 400) || "Could not parse explanation.",
          mainFunctions: "—",
          dependencies: "—",
          architectureRole: "—"
        };
      } else {
        parsed = {
          summary: text.slice(0, 280),
          purpose: text,
          mainFunctions: "",
          connections: ""
        };
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("explain-file error", error);
    return NextResponse.json(
      { error: "Failed to generate AI explanation for file." },
      { status: 500 }
    );
  }
}

