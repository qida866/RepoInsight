import { NextRequest, NextResponse } from "next/server";
import { GITHUB_API_BASE } from "@/lib/github-api-constants";

export const dynamic = "force-dynamic";

function getAuthHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3.raw",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing owner or repo" },
        { status: 400 }
      );
    }
    const res = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) {
      return NextResponse.json({ readme: null }, { status: 200 });
    }
    const readme = await res.text();
    return NextResponse.json({ readme });
  } catch (e) {
    console.error("readme API error", e);
    return NextResponse.json(
      { error: "Failed to fetch readme" },
      { status: 500 }
    );
  }
}
