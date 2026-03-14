"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FileNode } from "@/types/repo";
import type { AnalyzeResult } from "@/types/analyze";
import FileExplorer from "@/components/repo/FileExplorer";
import CodeViewer, { FileAiSummary } from "@/components/repo/CodeViewer";
import TechStackPanel from "@/components/repo/TechStackPanel";
import RepoIntelligencePanel from "@/components/repo/RepoIntelligencePanel";
import ArchitectureSummaryPanel from "@/components/repo/ArchitectureSummaryPanel";
import ArchitectureMapPanel, { getLayerForPath, type LayerId } from "@/components/repo/ArchitectureMapPanel";
import KeyFilesPanel from "@/components/repo/KeyFilesPanel";
import FileIntelligencePanel from "@/components/repo/FileIntelligencePanel";
import EntryPointsPanel from "@/components/repo/EntryPointsPanel";
import AIDemoPanel from "@/components/repo/AIDemoPanel";
import RunInstructionsPanel from "@/components/repo/RunInstructionsPanel";
import CodeFlowPanel from "@/components/repo/CodeFlowPanel";
import RepoActivityPanel from "@/components/repo/RepoActivityPanel";
import RepoTimelinePanel from "@/components/repo/RepoTimelinePanel";
import QuickStartGuidePanel from "@/components/repo/QuickStartGuidePanel";
import RepoChatPanel from "@/components/repo/RepoChatPanel";
import RepoCopilotPanel from "@/components/repo/RepoCopilotPanel";
import ReadmeInsightPanel from "@/components/repo/ReadmeInsightPanel";
import RepoNavigatorPanel from "@/components/repo/RepoNavigatorPanel";
import ArchitectureHeatmap from "@/components/repo/ArchitectureHeatmap";
import RepoSearchPanel from "@/components/repo/RepoSearchPanel";
import RepoResultHeader from "@/components/repo/RepoResultHeader";

const RepoGraph = dynamic(() => import("@/components/repo/RepoGraph"), {
  ssr: false
});

const RepoPreview = dynamic(() => import("@/components/repo/RepoPreview"), {
  ssr: false
});

interface RepoAnalysisDashboardProps {
  result: AnalyzeResult;
  /** Show "Share analysis" button in repo overview (default true) */
  showShareButton?: boolean;
}

export default function RepoAnalysisDashboard({ result, showShareButton = true }: RepoAnalysisDashboardProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileExplainVersion, setFileExplainVersion] = useState(0);
  const [dependencyGraph, setDependencyGraph] = useState<{
    nodes: { id: string; data: { label: string } }[];
    edges: { id: string; source: string; target: string }[];
  } | null>(null);
  const [dependencyGraphLoading, setDependencyGraphLoading] = useState(false);
  const [highlightedPaths, setHighlightedPaths] = useState<string[] | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<LayerId | null>(null);
  const [architectureFocusPaths, setArchitectureFocusPaths] = useState<string[] | null>(null);

  const fileTreeNodes: FileNode[] = useMemo(() => {
    const paths = result.fileTree ?? [];
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
  }, [result.fileTree]);

  const displayFileTreeNodes: FileNode[] = useMemo(() => {
    const paths = result.fileTree ?? [];
    const focusSet = architectureFocusPaths?.length ? new Set(architectureFocusPaths) : null;
    const allowed = focusSet
      ? paths.filter(
          (p) =>
            focusSet.has(p) ||
            architectureFocusPaths!.some((f) => f.startsWith(p + "/"))
        )
      : paths;
    const root: FileNode = { path: "", type: "dir", children: [] };
    for (const path of allowed) {
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
  }, [result.fileTree, architectureFocusPaths]);

  const codePreviewSnippet =
    selectedContent ||
    (result.summary && result.name && selectedPath
      ? `// ${selectedPath}\n// Repo: ${result.name}\n// AI Summary:\n// ${result.summary}`
      : result.summary && result.name
      ? `// Repo: ${result.name}\n// AI Summary:\n// ${result.summary}`
      : "// Code preview\n// Analyze a repository to see AI insights here.");

  const entryPointCandidates = (result.fileTree ?? []).filter((p) => {
    const lower = p.toLowerCase();
    return (
      lower.endsWith("app/page.tsx") ||
      lower.endsWith("src/app.tsx") ||
      lower.endsWith("src/main.tsx") ||
      lower === "server.js" ||
      lower === "index.js" ||
      lower.endsWith("main.py") ||
      lower.endsWith("app.py")
    );
  });

  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    setSelectedContent("");
    setFileError(null);
    setFileExplainVersion(0);
    setFileLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: result.owner, repo: result.repo, path })
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
          err instanceof Error ? err.message : "Failed to load file content from GitHub."
        );
      } finally {
        setFileLoading(false);
      }
    })();
  };

  const handleArchitectureLayerClick = (layerId: LayerId | null, paths: string[]) => {
    setSelectedLayerId(layerId ?? null);
    setArchitectureFocusPaths(layerId && paths.length ? paths : null);
    setHighlightedPaths(layerId && paths.length ? paths : null);
    if (layerId && paths.length > 0) {
      handleSelectFile(paths[0]!);
    }
  };

  const handleDependencyNodeClick = (nodeId: string) => {
    if (!result.fileTree) return;
    const layerInfo = getLayerForPath(result.fileTree, nodeId);
    if (layerInfo) {
      setSelectedLayerId(layerInfo.layerId);
      setArchitectureFocusPaths(layerInfo.paths);
      setHighlightedPaths(layerInfo.paths);
      handleSelectFile(nodeId);
    }
  };

  return (
    <div className="mt-8 space-y-6 text-left text-sm text-slate-200 fade-in-up">
      <RepoResultHeader result={result} showShareButton={showShareButton} />

      <TechStackPanel techStack={result.techStack ?? []} fileTree={result.fileTree} />

      <RepoIntelligencePanel
        fileTree={result.fileTree}
        name={result.name}
        description={result.description}
        techStack={result.techStack ?? []}
      />

      <RepoNavigatorPanel
        fileTree={result.fileTree}
        name={result.name}
        techStack={result.techStack ?? []}
        onNavigateFile={handleSelectFile}
        onHighlightFiles={setHighlightedPaths}
      />

      <RepoSearchPanel files={result.fileTree} onSelectFile={handleSelectFile} />

      <ArchitectureSummaryPanel fileTree={result.fileTree} />

      <ArchitectureMapPanel
        fileTree={result.fileTree}
        selectedLayerId={selectedLayerId}
        onLayerClick={handleArchitectureLayerClick}
        onSelectFile={handleSelectFile}
      />

      <KeyFilesPanel
        fileTree={result.fileTree}
        onSelectFile={handleSelectFile}
        selectedPath={selectedPath}
      />

      <EntryPointsPanel fileTree={result.fileTree} />

      <AIDemoPanel
        owner={result.owner}
        repo={result.repo}
        repoName={result.name}
        description={result.description}
        fileTree={result.fileTree}
        techStack={result.techStack ?? []}
      />

      <RunInstructionsPanel
        fileTree={result.fileTree}
        techStack={result.techStack ?? []}
      />

      <ArchitectureHeatmap fileTree={result.fileTree} />

      <CodeFlowPanel
        fileTree={result.fileTree}
        selectedPath={selectedPath}
        onSelectFile={handleSelectFile}
      />

      <RepoActivityPanel owner={result.owner} repo={result.repo} />
      <RepoTimelinePanel owner={result.owner} repo={result.repo} />
      <QuickStartGuidePanel
        fileTree={result.fileTree}
        techStack={result.techStack ?? []}
        repoUrl={`https://github.com/${result.owner}/${result.repo}`}
      />
      <ReadmeInsightPanel owner={result.owner} repo={result.repo} />

      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Architecture graph
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (dependencyGraph) {
                  setDependencyGraph(null);
                  return;
                }
                setDependencyGraphLoading(true);
                try {
                  const res = await fetch("/api/dependency-graph", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      owner: result.owner,
                      repo: result.repo,
                      fileTree: result.fileTree
                    })
                  });
                  const data = (await res.json()) as {
                    nodes?: { id: string; data: { label: string } }[];
                    edges?: { id: string; source: string; target: string }[];
                    error?: string;
                  };
                  if (res.ok && data.nodes && data.edges) {
                    setDependencyGraph({ nodes: data.nodes, edges: data.edges });
                  }
                } finally {
                  setDependencyGraphLoading(false);
                }
              }}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700/80"
            >
              {dependencyGraphLoading
                ? "Loading…"
                : dependencyGraph
                ? "Show layer view"
                : "Show import graph"}
            </button>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              {dependencyGraph ? "Imports · React Flow" : "Structure · React Flow"}
            </span>
          </div>
        </div>
        <div className="h-[420px] rounded-2xl border border-slate-800 bg-slate-950">
          <RepoGraph
            tree={fileTreeNodes}
            dependencyGraph={dependencyGraph ?? undefined}
            highlightedNodeIds={highlightedPaths ?? undefined}
            onNodeClick={handleDependencyNodeClick}
          />
        </div>
      </section>

      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Files & code
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950">
            <FileExplorer
              tree={displayFileTreeNodes}
              selectedPath={selectedPath}
              highlightedPaths={highlightedPaths}
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
                onExplain={() => setFileExplainVersion((prev) => prev + 1)}
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
            <FileIntelligencePanel
              code={codePreviewSnippet}
              path={selectedPath ?? undefined}
              repoName={result.name}
              version={fileExplainVersion ?? 0}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <div className="glass-panel space-y-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              AI explanation
            </div>
            {result.summary && (
              <div>
                <p className="text-xs leading-relaxed text-slate-300">{result.summary}</p>
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

          <RepoChatPanel
            name={result.name}
            description={result.description}
            techStack={result.techStack ?? []}
            fileTree={result.fileTree}
          />
          <RepoCopilotPanel
            owner={result.owner}
            repo={result.repo}
            name={result.name}
            description={result.description}
            techStack={result.techStack ?? []}
            fileTree={result.fileTree}
            entrypoints={entryPointCandidates}
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
  );
}
