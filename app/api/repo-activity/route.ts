import { NextRequest, NextResponse } from "next/server";
import { GITHUB_API_BASE } from "@/lib/github-api-constants";

export const dynamic = "force-dynamic";

function getAuthHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

interface CommitSummary {
  message: string;
  author: string;
  date: string;
  sha: string;
}

interface ContributorSummary {
  login: string;
  contributions: number;
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
    const headers = getAuthHeaders();
    const [commitsRes, contributorsRes, metaRes] = await Promise.all([
      fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=5`,
        { headers }
      ),
      fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=5`,
        { headers }
      ),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers })
    ]);

    let commits: CommitSummary[] = [];
    if (commitsRes.ok) {
      const json = (await commitsRes.json()) as any[];
      commits = json.map((c) => ({
        message: c.commit?.message?.split("\n")[0] ?? "",
        author:
          c.commit?.author?.name ?? c.author?.login ?? "Unknown",
        date: c.commit?.author?.date ?? "",
        sha: c.sha ?? ""
      }));
    }

    let contributors: ContributorSummary[] = [];
    if (contributorsRes.ok) {
      const json = (await contributorsRes.json()) as any[];
      contributors = json.map((u) => ({
        login: u.login,
        contributions: u.contributions
      }));
    }

    let lastUpdated: string | null = null;
    if (metaRes.ok) {
      const json = (await metaRes.json()) as any;
      lastUpdated = json.pushed_at ?? json.updated_at ?? null;
    }

    return NextResponse.json({
      commits,
      contributors,
      lastUpdated
    });
  } catch (e) {
    console.error("repo-activity API error", e);
    return NextResponse.json(
      { error: "Failed to fetch repo activity" },
      { status: 500 }
    );
  }
}
