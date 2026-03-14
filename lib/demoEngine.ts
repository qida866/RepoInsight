/**
 * DemoEngine — universal demo system for RepoInsight.
 *
 * Architecture:
 *   DemoEngine
 *   ├ FrameworkDetector (getDemoMode)
 *   ├ RepoFileLoader (loadRepoFiles)
 *   ├ path/template helpers for DemoRunner
 *   └ DemoRunner (UI) + SandboxPreview (frontend/static)
 *
 * Demo mode: frontend | node | python | static | unsupported
 */

import {
  getDemoMode,
  type DemoMode,
  type DemoModeResult,
  type FrameworkDetectorParams,
  type FrameworkRuntime,
} from "@/lib/frameworkDetector";
export type { DemoMode, DemoModeResult, FrameworkRuntime };
export { getDemoMode };

export { loadRepoFiles } from "@/lib/repoFileLoader";

/** Frontend runtimes that use Sandpack in-browser preview. */
export type FrontendRuntime = "next" | "vite" | "react" | "vue";

/** Sandpack template IDs used by this app (subset of Sandpack's templates). */
export type SandpackTemplateId =
  | "nextjs"
  | "vite-react-ts"
  | "vite-react"
  | "react-ts"
  | "react"
  | "vite-vue-ts"
  | "vite-vue"
  | "vue-ts"
  | "vanilla"
  | "vanilla-ts"
  | "static";

const MAX_PATHS = 45;
const FRONTEND_EXT = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".mjs", ".cjs"];
const STATIC_EXT = [".html", ".css", ".js", ".mjs", ".cjs"];

function isFrontendPath(p: string): boolean {
  const lower = p.toLowerCase();
  return lower === "package.json" || FRONTEND_EXT.some((ext) => lower.endsWith(ext));
}

function isStaticPath(p: string): boolean {
  const lower = p.toLowerCase();
  return STATIC_EXT.some((ext) => lower.endsWith(ext));
}

/**
 * Pick file paths to load for demo preview.
 * - frontend: priority paths for Next/Vite/React/Vue, then rest up to MAX_PATHS.
 * - static: index.html first, then other HTML/CSS/JS.
 * - node | python | unsupported: returns [] (no in-browser preview).
 */
export function pickPathsForDemo(
  mode: DemoMode,
  framework: FrameworkRuntime,
  fileTree: string[]
): string[] {
  if (mode === "frontend" && (framework === "next" || framework === "vite" || framework === "react" || framework === "vue")) {
    const allowed = fileTree.filter(isFrontendPath);
    const priority: string[] = [];
    const rest: string[] = [];
    for (const p of allowed) {
      const lower = p.toLowerCase();
      if (lower === "package.json") priority.push(p);
      else if (framework === "next" && (lower.includes("next.config") || lower.startsWith("app/") || lower.startsWith("pages/"))) priority.push(p);
      else if ((framework === "vite" || framework === "vue") && (lower === "index.html" || lower.includes("vite.config") || lower.startsWith("src/"))) priority.push(p);
      else if (framework === "react" && (lower === "index.html" || lower.startsWith("public/") || lower.startsWith("src/"))) priority.push(p);
      else rest.push(p);
    }
    const ordered = [...priority];
    for (const p of rest) {
      if (ordered.length >= MAX_PATHS) break;
      if (!ordered.includes(p)) ordered.push(p);
    }
    return ordered.slice(0, MAX_PATHS);
  }

  if (mode === "static") {
    const allowed = fileTree.filter(isStaticPath);
    const priority = allowed.filter((p) => p.toLowerCase().endsWith("index.html"));
    const rest = allowed.filter((p) => !p.toLowerCase().endsWith("index.html"));
    const ordered = [...priority, ...rest].slice(0, MAX_PATHS);
    return ordered;
  }

  return [];
}

/**
 * Map framework + fileTree to Sandpack template for frontend/static preview.
 */
export function getSandpackTemplate(
  mode: DemoMode,
  framework: FrameworkRuntime,
  fileTree: string[]
): SandpackTemplateId {
  if (mode === "static") return "static";
  if (mode !== "frontend") return "react";

  const hasTs = fileTree.some(
    (p) =>
      p.toLowerCase().endsWith("tsconfig.json") ||
      p.toLowerCase().endsWith(".tsx") ||
      p.toLowerCase().endsWith(".ts")
  );

  if (framework === "next") return "nextjs";
  if (framework === "vue") return hasTs ? "vite-vue-ts" : "vite-vue";
  if (framework === "vite") return hasTs ? "vite-react-ts" : "vite-react";
  if (framework === "react") return hasTs ? "react-ts" : "react";
  return hasTs ? "vite-react-ts" : "vite-react";
}

/**
 * Whether the demo mode supports an in-browser "Run Demo" preview (Sandpack).
 */
export function isRunnableInBrowser(mode: DemoMode): boolean {
  return mode === "frontend" || mode === "static";
}
