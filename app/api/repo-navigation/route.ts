import { NextRequest, NextResponse } from "next/server";
import { CLAUDE_API_URL } from "@/lib/claude-api-constants";

export const dynamic = "force-dynamic";

const SECTION_IDS = [
  "overview",
  "architecture",
  "key-modules",
  "api",
  "data",
  "auth",
  "config"
];

export interface NavSection {
  id: string;
  label: string;
  description: string;
  paths: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      fileTree?: string[];
      name?: string;
      techStack?: string[];
    };
    const { fileTree = [], name = "", techStack = [] } = body;

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || fileTree.length === 0) {
      return NextResponse.json({ sections: null });
    }

    const treeSample = fileTree.slice(0, 300).join("\n");
    const techLine =
      techStack.length > 0 ? `Tech stack: ${techStack.join(", ")}` : "Unknown";

    const systemPrompt =
      "You are an expert at mapping codebases to a navigation guide. " +
      "Given a list of file paths from a repository, assign files to these sections: " +
      "Overview (README, package.json, high-level docs), " +
      "Architecture (top-level app/src/pages structure), " +
      "Key Modules (components, services, features), " +
      "API Layer (api/, routes/, controllers), " +
      "Data Layer (models, db, prisma, migrations), " +
      "Authentication (auth, middleware, session, jwt), " +
      "Configuration (config, .env, settings). " +
      "You MUST respond with valid JSON only: { \"sections\": [ { \"id\": \"overview\", \"label\": \"Overview\", \"description\": \"...\", \"paths\": [\"path/from/list\"] }, ... ] }. " +
      "Use only these ids: overview, architecture, key-modules, api, data, auth, config. " +
      "Every path in each section's \"paths\" array MUST appear in the file list you were given. " +
      "Include only sections that have at least one file. " +
      "Keep descriptions to one short sentence.";

    const userPrompt = [
      name ? `Repository: ${name}` : null,
      techLine,
      "File list (use only these paths):",
      treeSample
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("repo-navigation API error", res.status, text);
      return NextResponse.json({ sections: null });
    }

    const json = (await res.json()) as { content?: { text?: string }[] };
    const text = json.content?.[0]?.text ?? "";

    const pathSet = new Set(fileTree.map((p) => p.toLowerCase()));

    try {
      const parsed = JSON.parse(text) as { sections?: NavSection[] };
      const sections = (parsed.sections ?? [])
        .filter((s): s is NavSection => Boolean(s.id && s.label && Array.isArray(s.paths)))
        .map((s) => ({
          ...s,
          paths: s.paths.filter((p) => pathSet.has(p.toLowerCase()))
        }))
        .filter((s) => s.paths.length > 0);
      return NextResponse.json({ sections });
    } catch {
      return NextResponse.json({ sections: null });
    }
  } catch (e) {
    console.error("repo-navigation error", e);
    return NextResponse.json({ sections: null });
  }
}
