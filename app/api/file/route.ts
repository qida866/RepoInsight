import { NextRequest, NextResponse } from "next/server";
import { GITHUB_API_BASE } from "@/lib/github-api-constants";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".css",
  ".html"
];

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, path } = (await req.json()) as {
      owner?: string;
      repo?: string;
      path?: string;
    };

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: "Missing owner, repo, or path" },
        { status: 400 }
      );
    }

    const lowerPath = path.toLowerCase();
    const allowed = ALLOWED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));

    if (!allowed) {
      return NextResponse.json(
        {
          content:
            `// Preview not available for this file type.\n// Path: ${path}`
        },
        { status: 200 }
      );
    }

    const res = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(
        path
      )}`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
          ...getAuthHeaders()
        },
        next: { revalidate: 60 }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          content:
            `// Failed to load file from GitHub.\n// Path: ${path}\n// Status: ${res.status}\n// ${text}`
        },
        { status: 200 }
      );
    }

    const content = await res.text();

    return NextResponse.json({ content }, { status: 200 });
  } catch (error) {
    console.error("file fetch error", error);
    return NextResponse.json(
      {
        content:
          "// Unexpected error while loading file content. Please try again."
      },
      { status: 200 }
    );
  }
}

