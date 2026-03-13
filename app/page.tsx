"use client";

import { FormEvent, useState } from "react";

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
  const [result, setResult] = useState<{
    name: string;
    description: string | null;
    stars: number;
    language: string | null;
    fileTree: string[];
    summary: string;
    explanation: string;
    learningPath: string[];
  } | null>(null);

  const { topLevelFolders, topLevelFiles } = (() => {
    if (!result) return { topLevelFolders: [], topLevelFiles: [] };
    const folders = new Set<string>();
    const files = new Set<string>();
    for (const path of result.fileTree) {
      const parts = path.split("/");
      if (parts.length > 1) {
        folders.add(parts[0]!);
      } else if (parts.length === 1) {
        files.add(parts[0]!);
      }
    }
    return {
      topLevelFolders: Array.from(folders).sort(),
      topLevelFiles: Array.from(files).sort()
    };
  })();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseGithubUrl(value);
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL or owner/repo.");
      return;
    }
    setError(null);
    setLoading(true);
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
        const json = (await res.json()) as {
          name: string;
          description: string | null;
          stars: number;
          language: string | null;
          fileTree: string[];
          summary: string;
          explanation: string;
          learningPath: string[];
        };
        setResult(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <section className="w-full max-w-3xl text-center">
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
          className="glass-panel mx-auto flex flex-col gap-3 p-4 text-left shadow-soft sm:flex-row sm:items-center"
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
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-soft transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-6"
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

        {result && (
          <div className="mt-6 text-left text-sm text-slate-200 fade-in-up">
            <div className="glass-panel border-slate-800/80 p-4 space-y-4 transition-all duration-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Repository
                  </div>
                  <div className="text-base font-semibold text-slate-50">
                    {result.name}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                    ⭐ {result.stars.toLocaleString()} stars
                  </span>
                  {result.language && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                      {result.language}
                    </span>
                  )}
                </div>
              </div>
              {result.description && (
                <p className="text-xs text-slate-400">{result.description}</p>
              )}
              {/* AI-powered understanding */}
              {result.summary && (
                <div className="mt-2">
                  <div className="mb-1 text-xs font-semibold text-slate-200">
                    Repo Summary
                  </div>
                  <p className="text-xs text-slate-300">
                    {result.summary}
                  </p>
                </div>
              )}
              {result.explanation && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-slate-200">
                    AI Explanation
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line">
                    {result.explanation}
                  </p>
                </div>
              )}
              {result.learningPath?.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-slate-200">
                    Learning Path
                  </div>
                  <ol className="space-y-1 text-xs text-slate-300">
                    {result.learningPath.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] font-semibold text-slate-200">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {(topLevelFolders.length > 0 || topLevelFiles.length > 0) && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-slate-200">
                    File Structure
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 text-xs">
                    {topLevelFolders.length > 0 && (
                      <div className="border-b border-slate-800 px-3 py-2">
                        {topLevelFolders.map((folder) => (
                          <div
                            key={folder}
                            className="flex items-center gap-2 text-slate-300"
                          >
                            <span className="text-slate-500">📁</span>
                            <span>{folder}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {topLevelFiles.length > 0 && (
                      <div className="px-3 py-2">
                        {topLevelFiles.map((file) => (
                          <div
                            key={file}
                            className="flex items-center gap-2 text-slate-300"
                          >
                            <span className="text-slate-500">📄</span>
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

