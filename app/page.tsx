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

type RepoResult = {
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  fileTree: string[];
  summary: string;
  explanation: string;
  learningPath: string[];
};

export default function LandingPage() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RepoResult | null>(null);

  const { topLevelFolders, topLevelFiles } = (() => {
    if (!result) {
      return {
        topLevelFolders: [] as string[],
        topLevelFiles: [] as string[]
      };
    }

    const folders = new Set<string>();
    const files = new Set<string>();

    for (const path of result.fileTree) {
      const parts = path.split("/");

      if (parts.length > 1) {
        folders.add(parts[0]);
      } else if (parts.length === 1) {
        files.add(parts[0]);
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
            if (data?.error) message = data.error;
          } catch {
            const text = await res.text();
            if (text) message = text;
          }

          throw new Error(message);
        }

        const json = (await res.json()) as RepoResult;

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

        <h1 className="mb-4 text-4xl font-semibold text-slate-50">
          Understand Any GitHub Repo{" "}
          <span className="gradient-text">in Seconds</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-sm text-slate-400">
          Paste a GitHub repository and instantly visualize its architecture,
          tech stack, and learning path.
        </p>

        <form
          onSubmit={onSubmit}
          className="glass-panel mx-auto flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            placeholder="https://github.com/vercel/next.js"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-black"
          >
            {loading ? "Analyzing..." : "Analyze Repo"}
          </button>
        </form>

        {error && (
          <p className="mt-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 text-left text-sm text-slate-200">

            <div className="text-lg font-semibold">
              {result.name}
            </div>

            {result.description && (
              <p className="text-xs text-slate-400 mt-1">
                {result.description}
              </p>
            )}

            <div className="mt-2 text-xs">
              ⭐ {result.stars} stars
            </div>

            {result.summary && (
              <div className="mt-4">
                <div className="text-xs font-semibold">Repo Summary</div>
                <p className="text-xs text-slate-300">
                  {result.summary}
                </p>
              </div>
            )}

            {result.explanation && (
              <div className="mt-4">
                <div className="text-xs font-semibold">AI Explanation</div>
                <p className="text-xs text-slate-300 whitespace-pre-line">
                  {result.explanation}
                </p>
              </div>
            )}

            {result.learningPath?.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold">Learning Path</div>

                <ol className="text-xs text-slate-300 space-y-1">
                  {result.learningPath.map((step, i) => (
                    <li key={i}>
                      {i + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(topLevelFolders.length > 0 || topLevelFiles.length > 0) && (
              <div className="mt-4">

                <div className="text-xs font-semibold mb-1">
                  File Structure
                </div>

                <div className="text-xs">

                  {topLevelFolders.map((folder) => (
                    <div key={folder}>📁 {folder}</div>
                  ))}

                  {topLevelFiles.map((file) => (
                    <div key={file}>📄 {file}</div>
                  ))}

                </div>
              </div>
            )}

          </div>
        )}
      </section>
    </div>
  );
}