import { NextRequest, NextResponse } from "next/server";
import { GITHUB_API_BASE } from "@/lib/github-api-constants";

export const dynamic = "force-dynamic";

const MAX_PATHS = 45;

const ALLOWED_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html",
  ".mjs", ".cjs"
];

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isAllowedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext)) || lower === "package.json";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { owner?: string; repo?: string; paths?: string[] };
    const { owner, repo, paths: rawPaths } = body;

    if (!owner || !repo || !Array.isArray(rawPaths)) {
      return NextResponse.json(
        { error: "Missing owner, repo, or paths array" },
        { status: 400 }
      );
    }

    const paths = rawPaths
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .filter(isAllowedPath)
      .slice(0, MAX_PATHS);

    const headers = {
      Accept: "application/vnd.github.v3.raw",
      ...getAuthHeaders()
    };

    const results = await Promise.all(
      paths.map(async (path) => {
        const res = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
          { headers }
        );
        if (!res.ok) return { path, content: null };
        const text = await res.text();
        return { path, content: text };
      })
    );

    const files: Record<string, string> = {};
    for (const { path, content } of results) {
      if (content !== null) files[path] = content;
    }

    return NextResponse.json({ files });
  } catch (e) {
    console.error("files API error", e);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
