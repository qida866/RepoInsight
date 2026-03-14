import { NextRequest, NextResponse } from "next/server";
import { GITHUB_API_BASE } from "@/lib/github-api-constants";
import { buildDependencyGraph } from "@/lib/repoAnalyzer";

export const dynamic = "force-dynamic";

const MAX_FILES = 70;
const SOURCE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function isSourcePath(p: string): boolean {
  const lower = p.toLowerCase();
  return SOURCE_EXT.some((ext) => lower.endsWith(ext));
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      owner?: string;
      repo?: string;
      fileTree?: string[];
    };
    const { owner, repo, fileTree } = body;

    if (!owner || !repo || !Array.isArray(fileTree)) {
      return NextResponse.json(
        { error: "Missing owner, repo, or fileTree" },
        { status: 400 }
      );
    }

    const paths = fileTree
      .filter((p): p is string => typeof p === "string" && isSourcePath(p))
      .slice(0, MAX_FILES);

    if (paths.length === 0) {
      return NextResponse.json({
        nodes: [],
        edges: []
      });
    }

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

    const fileContents: Record<string, string> = {};
    for (const { path, content } of results) {
      if (content !== null) fileContents[path] = content;
    }

    const dependencyGraph = buildDependencyGraph(fileContents);

    return NextResponse.json({
      nodes: dependencyGraph.nodes,
      edges: dependencyGraph.edges
    });
  } catch (e) {
    console.error("dependency-graph error", e);
    return NextResponse.json(
      { error: "Failed to build dependency graph" },
      { status: 500 }
    );
  }
}
