"use client";

import { FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FileNode } from "@/types/repo";
import FileExplorer from "@/components/repo/FileExplorer";
import CodeViewer, { FileAiSummary } from "@/components/repo/CodeViewer";
import TechStackPanel from "@/components/repo/TechStackPanel";
import RepoIntelligencePanel from "@/components/repo/RepoIntelligencePanel";
import ArchitectureSummaryPanel from "@/components/repo/ArchitectureSummaryPanel";
import EntryPointsPanel from "@/components/repo/EntryPointsPanel";
import DemoRunnerPanel from "@/components/repo/DemoRunnerPanel";
import RunInstructionsPanel from "@/components/repo/RunInstructionsPanel";
import CodeFlowPanel from "@/components/repo/CodeFlowPanel";
import RepoActivityPanel from "@/components/repo/RepoActivityPanel";
import QuickStartGuidePanel from "@/components/repo/QuickStartGuidePanel";
import RepoChatPanel from "@/components/repo/RepoChatPanel";
import ReadmeInsightPanel from "@/components/repo/ReadmeInsightPanel";
import RepoNavigatorPanel from "@/components/repo/RepoNavigatorPanel";
import ArchitectureHeatmap from "@/components/repo/ArchitectureHeatmap";
import RepoSearchPanel from "@/components/repo/RepoSearchPanel";

const RepoGraph = dynamic(() => import("@/components/repo/RepoGraph"), {
  ssr: false
});

const RepoPreview = dynamic(() => import("@/components/repo/RepoPreview"), {
  ssr: false
});

/** API response shape from POST /api/analyze when called with { url } */
interface AnalyzeResult {
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  fileTree: string[];
   techStack: string[];
  summary: string;
  explanation: string;
  learningPath: string[];
}

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
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileExplainVersion, setFileExplainVersion] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const fileTreeNodes: FileNode[] = useMemo(() => {
    const paths = result?.fileTree ?? [];
    const root: FileNode = { path: "", type: "dir", children: [] };

    for (const path of paths) {
      const segments = path.split("/");
      let current = root;

      for (let i = 0; i < segments.length; i++) {
        const part = segments[i]!;
        if (!current.children) current.children = [];
        const isLast = i === segments.length - 1;
        const fullPath = current.path ? `${current.path}/${part}` : part;

        let child = current.children.find((c) => c.path === fullPath);
        if (!child) {
          child = {
            path: fullPath,
            type: isLast ? "file" : "dir",
            children: isLast ? undefined : []
          };
          current.children.push(child);
        }
        current = child;
      }
    }

    return root.children ?? [];
  }, [result?.fileTree]);

  const codePreviewSnippet =
    selectedContent ||
    (result?.summary && result.name && selectedPath
      ? `// ${selectedPath}\n// Repo: ${result.name}\n// AI Summary:\n// ${result.summary}`
      : result?.summary && result.name
      ? `// Repo: ${result.name}\n// AI Summary:\n// ${result.summary}`
      : "// Code preview\n// Analyze a repository to see AI insights here.");

  const repoFileCount = result?.fileTree.length ?? 0;
  const repoSizeLabel =
    repoFileCount === 0
      ? "No files detected"
      : repoFileCount < 200
      ? "Small codebase"
      : repoFileCount < 1000
      ? "Medium-sized codebase"
      : "Large codebase";

  const topTechs = (result?.techStack ?? []).slice(0, 3);
  const entryPointCandidates = (result?.fileTree ?? []).filter((p) => {
    const lower = p.toLowerCase();
    return (
      lower.endsWith("app/page.tsx") || // Next.js
      lower.endsWith("src/app.tsx") ||
      lower.endsWith("src/main.tsx") || // React / Vite
      lower === "server.js" || // Node
      lower === "index.js" ||
      lower.endsWith("main.py") || // Python
      lower.endsWith("app.py")
    );
  });
  const entryPointsOverview = entryPointCandidates.slice(0, 3);

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
    setSelectedPath(null);
    setSelectedContent("");
    setFileError(null);

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

  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    setSelectedContent("");
    setFileError(null);
    setFileExplainVersion(0);

    if (!result) return;

    setFileLoading(true);

    void (async () => {
      try {
        const res = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: result.owner,
            repo: result.repo,
            path
          })
        });
        const json = (await res.json()) as { content?: string; error?: string };
        if (json.error) {
          setFileError(json.error);
        } else if (json.content) {
          setSelectedContent(json.content);
        } else {
          setSelectedContent(
            `// No content returned for ${path}.\n// This file may be binary or unsupported.`
          );
        }
      } catch (err) {
        setFileError(
          err instanceof Error
            ? err.message
            : "Failed to load file content from GitHub."
        );
      } finally {
        setFileLoading(false);
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

        {result && (
          <div className="mt-8 space-y-6 text-left text-sm text-slate-200 fade-in-up">
            {/* Repo overview + Tech stack */}
            <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
              {/* Repo overview */}
              <div className="glass-panel transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Repo overview
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-slate-50">
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
                    {repoFileCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                        {repoSizeLabel} · ~{repoFileCount} files
                      </span>
                    )}
                    {typeof window !== "undefined" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const base =
                              window.location.origin || "https://repoinsight.app";
                            const shareUrl = `${base}/analyze/${result.owner}/${result.repo}`;
                            await navigator.clipboard.writeText(shareUrl);
                            setShareCopied(true);
                            window.setTimeout(() => setShareCopied(false), 1500);
                          } catch {
                            // ignore copy failures
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-slate-800/80"
                      >
                        {shareCopied ? "Link copied" : "Share analysis"}
                      </button>
                    )}
                  </div>
                </div>
                {result.description && (
                  <p className="mb-3 text-xs leading-relaxed text-slate-400">
                    {result.description}
                  </p>
                )}
                <div className="grid gap-3 text-[11px] text-slate-300 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 font-medium text-slate-300">
                      Tech stack
                    </div>
                    {topTechs.length === 0 ? (
                      <p className="text-slate-500">
                        Not yet inferred from manifests.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {topTechs.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-100"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 font-medium text-slate-300">
                      Entry points
                    </div>
                    {entryPointsOverview.length === 0 ? (
                      <p className="text-slate-500">
                        No standard Next.js, React, Node, or Python entry files detected.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {entryPointsOverview.map((p) => (
                          <li
                            key={p}
                            className="font-mono text-[10px] text-slate-100"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Tech stack panel */}
              <TechStackPanel
                techStack={result.techStack ?? []}
                fileTree={result.fileTree}
              />
            </section>

            {/* Repo intelligence */}
            <RepoIntelligencePanel
              fileTree={result.fileTree}
              name={result.name}
              description={result.description}
              techStack={result.techStack ?? []}
            />

            {/* Repo navigator */}
            <RepoNavigatorPanel
              fileTree={result.fileTree}
              onNavigateFile={handleSelectFile}
            />

            {/* Repo search */}
            <RepoSearchPanel
              files={result.fileTree}
              onSelectFile={handleSelectFile}
            />

            {/* Architecture summary map */}
            <ArchitectureSummaryPanel fileTree={result.fileTree} />

            {/* Project entry points */}
            <EntryPointsPanel fileTree={result.fileTree} />

            {/* Demo runner */}
            <DemoRunnerPanel
              fileTree={result.fileTree}
              techStack={result.techStack ?? []}
            />

            {/* Run instructions (simple view) */}
            <RunInstructionsPanel
              fileTree={result.fileTree}
              techStack={result.techStack ?? []}
            />

            {/* Architecture heatmap */}
            <ArchitectureHeatmap fileTree={result.fileTree} />

            {/* Code flow */}
            <CodeFlowPanel fileTree={result.fileTree} />

            {/* Repo activity */}
            <RepoActivityPanel owner={result.owner} repo={result.repo} />

            {/* Quick start guide */}
            <QuickStartGuidePanel
              fileTree={result.fileTree}
              techStack={result.techStack ?? []}
              repoUrl={`https://github.com/${result.owner}/${result.repo}`}
            />

            {/* README insight */}
            <ReadmeInsightPanel owner={result.owner} repo={result.repo} />

            {/* Architecture Graph */}
            <section className="glass-panel">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Architecture graph
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  Structure · React Flow
                </span>
              </div>
              <div className="h-[420px] rounded-2xl border border-slate-800 bg-slate-950">
                <RepoGraph tree={fileTreeNodes} />
              </div>
            </section>

            {/* File explorer + Code viewer */}
            <section className="glass-panel">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Files & code
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
                <div className="rounded-xl border border-slate-800 bg-slate-950">
                  <FileExplorer
                    tree={fileTreeNodes}
                    selectedPath={selectedPath}
                    onSelectFile={handleSelectFile}
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="h-[320px]">
                    <CodeViewer
                      code={codePreviewSnippet}
                      language="typescript"
                      title="Code viewer"
                      className="h-full"
                      path={selectedPath ?? undefined}
                      onExplain={() =>
                        setFileExplainVersion((prev) => prev + 1)
                      }
                    />
                  </div>
                  <div className="h-[140px]">
                    <FileAiSummary
                      code={codePreviewSnippet}
                      path={selectedPath ?? undefined}
                      repoName={result.name}
                      version={fileExplainVersion || undefined}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* AI Explanation (repo-level) + Live demo */}
            <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="space-y-4">
                {/* Repo-level AI explanation */}
                <div className="glass-panel space-y-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    AI explanation
                  </div>
                  {result.summary && (
                    <div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {result.summary}
                      </p>
                    </div>
                  )}
                  {result.explanation && (
                    <div>
                      <p className="text-xs whitespace-pre-line leading-relaxed text-slate-300">
                        {result.explanation}
                      </p>
                    </div>
                  )}
                  {result.learningPath?.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold text-slate-200">
                        Learning path
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
                </div>

                {/* Repo chat */}
                <RepoChatPanel
                  name={result.name}
                  description={result.description}
                  techStack={result.techStack ?? []}
                  fileTree={result.fileTree}
                />
              </div>

              <section className="glass-panel">
                <div className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Live preview
                </div>
                <div className="h-[260px]">
                  <RepoPreview fileTree={fileTreeNodes} fileContents={{}} />
                </div>
              </section>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

