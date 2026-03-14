"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalyzeResult } from "@/types/analyze";
import { addRecentRepo } from "@/lib/recentRepos";
import RepoAnalysisDashboard from "@/components/repo/RepoAnalysisDashboard";

/** Preloaded cache path for example repos: show cached analysis first, then refresh in background. */
const PRELOADED_CACHE: Record<string, string> = {
  "vercel/next.js": "/analysis-cache/vercel-nextjs.json",
  "facebook/react": "/analysis-cache/facebook-react.json",
};

interface AnalyzePageClientProps {
  owner: string;
  repo: string;
}

export default function AnalyzePageClient({ owner, repo }: AnalyzePageClientProps) {
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundUpdating, setBackgroundUpdating] = useState(false);
  const showedCachedRef = useRef(false);

  const cacheKey = `${owner}/${repo}`;
  const cacheUrl = PRELOADED_CACHE[cacheKey];

  useEffect(() => {
    let cancelled = false;
    showedCachedRef.current = false;

    async function run() {
      setLoading(true);
      setError(null);
      setBackgroundUpdating(false);

      const githubUrl = `https://github.com/${owner}/${repo}`;

      if (cacheUrl) {
        try {
          const cacheRes = await fetch(cacheUrl);
          if (!cancelled && cacheRes.ok) {
            const cached = (await cacheRes.json()) as AnalyzeResult;
            setResult(cached);
            setLoading(false);
            showedCachedRef.current = true;
            addRecentRepo(cached.owner, cached.repo, cached.name);
            setBackgroundUpdating(true);
          }
        } catch {
          // fall through to API-only flow
        }
      }

      if (cancelled) return;

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: githubUrl }),
        });

        if (cancelled) return;

        if (!res.ok) {
          if (!showedCachedRef.current) {
            let message = "Failed to analyze repository";
            try {
              const data = (await res.json()) as { error?: string };
              if (data?.error) message = data.error;
            } catch {
              const text = await res.text();
              if (text) message = text;
            }
            setError(message);
          }
          setLoading(false);
          setBackgroundUpdating(false);
          return;
        }

        const json = (await res.json()) as AnalyzeResult;
        setResult(json);
        addRecentRepo(json.owner, json.repo, json.name);
      } catch (err) {
        if (!cancelled && !showedCachedRef.current) {
          setError(
            err instanceof Error ? err.message : "Unexpected error occurred"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBackgroundUpdating(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [owner, repo, cacheUrl]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="glass-panel flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <span className="spinner h-8 w-8 rounded-full border-2 border-slate-600 border-t-sky-400" />
          <p className="text-sm text-slate-300">
            Analyzing <span className="font-mono text-slate-200">{owner}/{repo}</span>…
          </p>
          <p className="text-xs text-slate-500">
            Fetching repo, detecting tech stack, and generating insights.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="glass-panel border-red-900/40 p-6">
          <p className="text-sm font-medium text-red-400">Analysis failed</p>
          <p className="mt-1 text-sm text-slate-400">{error}</p>
          <p className="mt-3 text-xs text-slate-500">
            Ensure the repository is public. If it persists, check{" "}
            <code className="rounded bg-slate-900 px-1 py-0.5">GITHUB_TOKEN</code> and{" "}
            <code className="rounded bg-slate-900 px-1 py-0.5">CLAUDE_API_KEY</code>.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="w-full">
      {backgroundUpdating && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          <span className="spinner h-3 w-3 rounded-full border-2 border-slate-500 border-t-sky-400" />
          Updating analysis in background…
        </div>
      )}
      <RepoAnalysisDashboard result={result} showShareButton />
    </div>
  );
}
