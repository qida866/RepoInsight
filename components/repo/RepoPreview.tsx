"use client";

import { useMemo } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import type { FileNode } from "@/types/repo";
import CodeViewer from "./CodeViewer";

interface RepoPreviewProps {
  fileTree: FileNode[];
  fileContents?: Record<string, string>;
}

function hasFile(path: string, tree: FileNode[]): boolean {
  let found = false;
  const walk = (node: FileNode) => {
    if (node.type === "file" && node.path.toLowerCase() === path.toLowerCase()) {
      found = true;
      return;
    }
    node.children?.forEach(walk);
  };
  tree.forEach(walk);
  return found;
}

function firstFileMatching(tree: FileNode[], predicate: (p: string) => boolean): string | null {
  let match: string | null = null;
  const walk = (node: FileNode) => {
    if (match) return;
    if (node.type === "file" && predicate(node.path.toLowerCase())) {
      match = node.path;
      return;
    }
    node.children?.forEach(walk);
  };
  tree.forEach(walk);
  return match;
}

export default function RepoPreview({ fileTree, fileContents }: RepoPreviewProps) {
  const isLikelyFrontend = useMemo(() => {
    return (
      hasFile("package.json", fileTree) ||
      hasFile("vite.config.ts", fileTree) ||
      hasFile("vite.config.js", fileTree) ||
      hasFile("next.config.js", fileTree) ||
      hasFile("next.config.mjs", fileTree) ||
      hasFile("src/main.tsx", fileTree) ||
      hasFile("src/main.jsx", fileTree) ||
      hasFile("app/page.tsx", fileTree) ||
      hasFile("pages/index.tsx", fileTree)
    );
  }, [fileTree]);

  const pkgJsonPath = useMemo(
    () => firstFileMatching(fileTree, (p) => p.endsWith("package.json")),
    [fileTree]
  );

  const readmePath = useMemo(
    () =>
      firstFileMatching(
        fileTree,
        (p) => p.endsWith("readme.md") || p === "readme"
      ),
    [fileTree]
  );

  const pkgJson = pkgJsonPath ? fileContents?.[pkgJsonPath] ?? "" : "";

  const frameworkFlags = useMemo(() => {
    if (!pkgJson) {
      return {
        hasVite: false,
        hasNext: false,
        hasReact: false
      };
    }

    let scriptsText = "";
    let depNames = new Set<string>();

    try {
      const pkg = JSON.parse(pkgJson) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      scriptsText = Object.values(pkg.scripts ?? {})
        .join(" ")
        .toLowerCase();
      depNames = new Set(
        Object.keys(pkg.dependencies ?? {})
          .concat(Object.keys(pkg.devDependencies ?? {}))
          .map((d) => d.toLowerCase())
      );
    } catch {
      scriptsText = "";
      depNames = new Set();
    }

    const hasDep = (name: string | string[]) => {
      if (Array.isArray(name)) {
        return name.some((n) => depNames.has(n.toLowerCase()));
      }
      return depNames.has(name.toLowerCase());
    };

    const lower = pkgJson.toLowerCase();

    const hasVite =
      hasDep("vite") ||
      lower.includes('"vite"') ||
      scriptsText.includes("vite");
    const hasNext =
      hasDep("next") ||
      lower.includes('"next"') ||
      scriptsText.includes("next dev") ||
      scriptsText.includes("next start");
    const hasReact =
      hasDep(["react", "react-dom"]) ||
      lower.includes('"react"') ||
      scriptsText.includes("react-scripts");

    return { hasVite, hasNext, hasReact };
  }, [pkgJson]);

  const canUseSandpack =
    !!pkgJsonPath &&
    (frameworkFlags.hasVite || frameworkFlags.hasNext || frameworkFlags.hasReact);

  const readmeContent =
    (readmePath && fileContents?.[readmePath]) ||
    "# README\n\nREADME content is not available in this preview. Open the README file from the explorer to read it in full.";

  const likelyEntrypoint =
    firstFileMatching(fileTree, (p) =>
      p.endsWith("app/page.tsx") ||
      p.endsWith("pages/index.tsx") ||
      p.endsWith("src/main.tsx") ||
      p.endsWith("src/main.jsx") ||
      p.endsWith("index.html")
    ) ?? undefined;

  const frameworkLabel = frameworkFlags.hasNext
    ? "Next.js (React)"
    : frameworkFlags.hasVite
    ? "Vite (React)"
    : frameworkFlags.hasReact
    ? "React"
    : isLikelyFrontend
    ? "Likely frontend project"
    : "Unknown";

  const isRunnable =
    canUseSandpack &&
    !!pkgJsonPath &&
    !!pkgJson &&
    (frameworkFlags.hasNext || frameworkFlags.hasVite || frameworkFlags.hasReact);

  const notRunnableReason = !canUseSandpack
    ? "This preview runs against generic React/Next templates, not the repo's real build, so live execution is disabled."
    : !pkgJsonPath
    ? "No package.json was detected, so a safe start command cannot be inferred."
    : !pkgJson
    ? "package.json content is not available in this preview."
    : !isRunnable
    ? "The detected stack is not supported for live execution here."
    : "";

  if (canUseSandpack) {
    return (
      <div className="glass-panel flex h-full flex-col gap-3 border-slate-800/80 bg-slate-950/90 p-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-2 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Preview readiness
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-400">
              Detected
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Framework</span>
              <span className="font-medium text-slate-100">{frameworkLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Likely entrypoint</span>
              <span className="font-mono text-[10px] text-slate-100">
                {likelyEntrypoint ?? "Not obvious from file tree"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Runnable in browser</span>
              <span className="font-medium text-emerald-400">
                {isRunnable ? "Simulated template preview" : "Not safely runnable"}
              </span>
            </div>
          </div>
          {!isRunnable && notRunnableReason && (
            <p className="text-[11px] text-slate-400">
              {notRunnableReason}
            </p>
          )}
        </div>
        <div className="h-[320px] overflow-hidden rounded-lg border border-slate-800 bg-black/80">
          <Sandpack
            template={
              frameworkFlags.hasNext
                ? "nextjs"
                : frameworkFlags.hasVite
                ? "react-ts"
                : "react"
            }
            options={{
              showNavigator: true,
              showTabs: true,
              showLineNumbers: true,
              externalResources: [],
              editorHeight: 220,
              classes: {
                "sp-wrapper": "bg-slate-950",
                "sp-layout": "bg-slate-950",
                "sp-tabs": "bg-slate-900",
                "sp-tab-button": "text-slate-300"
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col gap-3 border-slate-800/80 bg-slate-950/90 p-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="flex flex-col gap-2 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Preview readiness
          </span>
          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Analysis
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Framework</span>
            <span className="font-medium text-slate-100">{frameworkLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Likely entrypoint</span>
            <span className="font-mono text-[10px] text-slate-100">
              {likelyEntrypoint ?? "Not obvious from file tree"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Runnable in browser</span>
            <span className="font-medium text-amber-400">
              Live execution not available
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Live execution is not available for this repository preview, but you can still
          explore the file tree and open key files (like README and entrypoints) in the
          code viewer to understand how the project works.
        </p>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <CodeViewer
          code={readmeContent}
          language="markdown"
          title="README preview"
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

