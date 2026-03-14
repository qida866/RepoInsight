"use client";

import { FormEvent, useState } from "react";
import type { AnalyzeResult } from "@/types/analyze";
import { addRecentRepo } from "@/lib/recentRepos";
import RepoAnalysisDashboard from "@/components/repo/RepoAnalysisDashboard";
import FeaturedRepos from "@/components/landing/FeaturedRepos";
import SavedRepos from "@/components/landing/SavedRepos";
import RecentRepos from "@/components/landing/RecentRepos";

function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(input.trim());
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
  } catch {
    const parts = input.split("/").filter(Boolean);
    if (parts.length === 2) {
      return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
    }
    return null;
  }
}

export default function LandingPage() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [progressStep, setProgressStep] = useState(0);

  if (loading && progressStep > 0 && progressStep < 4) {
    // Advance progress steps on client while waiting for /api/analyze
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setProgressStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 600);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseGithubUrl(value);
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL or owner/repo.");
      return;
    }
    setError(null);
    setLoading(true);
    setProgressStep(1);
    setResult(null);

    void (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value.trim() })
        });
        if (!res.ok) {
          let message = "Failed to analyze repository";
          try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) {
              message = data.error;
            }
          } catch {
            const text = await res.text();
            if (text) message = text;
          }
          throw new Error(message);
        }
        const json = (await res.json()) as AnalyzeResult;
        setResult(json);
        addRecentRepo(json.owner, json.repo, json.name);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unexpected error occurred"
        );
      } finally {
        setLoading(false);
        setProgressStep(0);
      }
    })();
  };

  return (
    <div className="w-full">
      <section className="w-full max-w-7xl mx-auto px-6 py-10 text-center">
        <p className="mb-4 inline-flex items-center rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-400 shadow-soft">
          AI developer tool · RepoInsight
        </p>
        <h1 className="mb-4 text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
          Understand Any GitHub Repo{" "}
          <span className="gradient-text">in Seconds</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-balance text-sm text-slate-400 sm:text-base">
          Paste a GitHub repository and instantly visualize its architecture,
          tech stack, and learning path. Designed for engineers who want to
          grok unfamiliar codebases fast.
        </p>

        <form
          onSubmit={onSubmit}
          className="glass-panel mx-auto flex flex-col gap-3 p-4 text-left shadow-soft sm:flex-row sm:items-center transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_20px_60px_rgba(15,23,42,0.85)]"
        >
          <div className="flex-1">
            <label
              htmlFor="repoUrl"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              GitHub repository URL
            </label>
            <input
              id="repoUrl"
              type="text"
              placeholder="https://github.com/vercel/next.js"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {error && (
              <p className="mt-1 text-xs text-red-400">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-soft transition hover:bg-sky-400 hover:-translate-y-px hover:shadow-[0_12px_30px_rgba(56,189,248,0.55)] disabled:cursor-not-allowed disabled:opacity-70 sm:mt-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner h-3 w-3 rounded-full border-2 border-sky-200/40 border-t-sky-50" />
                <span>Analyzing…</span>
              </span>
            ) : (
              "Analyze Repo"
            )}
          </button>
        </form>

        <FeaturedRepos />

        <SavedRepos />

        <RecentRepos />

        {loading && !result && (
          <div className="mt-8 space-y-4 text-left text-sm text-slate-200">
            <section className="glass-panel">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Analysis progress
              </div>
              <ol className="space-y-1 text-[11px] text-slate-300">
                {[
                  "Fetch repo metadata",
                  "Detect tech stack",
                  "Build architecture graph",
                  "Generate insights"
                ].map((label, index) => {
                  const stepIndex = index + 1;
                  const isActive = progressStep === stepIndex;
                  const isCompleted = progressStep > stepIndex;
                  return (
                    <li key={label} className="flex items-center gap-2">
                      <span
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                          isCompleted
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                            : isActive
                            ? "border-sky-500 bg-sky-500/20 text-sky-100"
                            : "border-slate-600 bg-slate-900 text-slate-500"
                        ].join(" ")}
                      >
                        {stepIndex}
                      </span>
                      <span
                        className={
                          isCompleted || isActive ? "text-slate-100" : "text-slate-500"
                        }
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
            {/* Skeleton: overview + tech stack */}
            <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
              <div className="glass-panel border-slate-800/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="h-3 w-24 skeleton" />
                  <div className="h-6 w-20 skeleton rounded-full" />
                </div>
                <div className="mb-2 h-4 w-40 skeleton" />
                <div className="h-3 w-full skeleton" />
                <div className="mt-2 h-3 w-5/6 skeleton" />
              </div>
              <div className="glass-panel border-slate-800/80 p-4 space-y-3">
                <div className="h-3 w-24 skeleton" />
                <div className="h-3 w-40 skeleton" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-20 skeleton rounded-full" />
                  <div className="h-7 w-24 skeleton rounded-full" />
                  <div className="h-7 w-16 skeleton rounded-full" />
                </div>
              </div>
            </section>

            {/* Skeleton: repo intelligence */}
            <section className="glass-panel border-slate-800/80 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="h-3 w-28 skeleton" />
                <div className="h-3 w-32 skeleton" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="h-3 w-24 skeleton" />
                  <div className="h-4 w-full skeleton rounded-full" />
                  <div className="h-4 w-5/6 skeleton rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-28 skeleton" />
                  <div className="h-5 w-24 skeleton rounded-full" />
                  <div className="h-5 w-20 skeleton rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-32 skeleton" />
                  <div className="h-5 w-16 skeleton rounded-full" />
                  <div className="h-5 w-24 skeleton rounded-full" />
                </div>
              </div>
            </section>

            {/* Skeleton: architecture graph */}
            <section className="glass-panel">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="h-3 w-28 skeleton" />
                <div className="h-3 w-20 skeleton" />
              </div>
              <div className="h-[220px] w-full skeleton rounded-xl" />
            </section>

            {/* Skeleton: files & code */}
            <section className="glass-panel">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="h-3 w-24 skeleton" />
              </div>
              <div className="grid h-[220px] grid-cols-[300px_1fr] gap-3">
                <div className="h-full w-full skeleton rounded-xl" />
                <div className="h-full w-full skeleton rounded-xl" />
              </div>
            </section>

            {/* Skeleton: AI explanation + live demo */}
            <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="glass-panel space-y-3">
                <div className="h-3 w-32 skeleton" />
                <div className="h-3 w-full skeleton" />
                <div className="h-3 w-5/6 skeleton" />
                <div className="h-3 w-2/3 skeleton" />
              </div>
              <div className="glass-panel">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="h-3 w-24 skeleton" />
                  <div className="h-3 w-32 skeleton" />
                </div>
                <div className="h-[180px] w-full skeleton rounded-xl" />
              </div>
            </section>
          </div>
        )}

        {result && <RepoAnalysisDashboard result={result} showShareButton />}

      </section>
    </div>
  );
}

