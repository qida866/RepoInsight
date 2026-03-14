/**
 * RepoFileLoader — load repository files from GitHub API for Sandpack.
 *
 * Extracts:
 * - Entry files (package.json, index.html, main entrypoints)
 * - Frontend files (source code: .ts, .tsx, .js, .jsx, .css, configs)
 * - Public assets (files in public/ with loadable extensions)
 *
 * Pass the resulting files into Sandpack via the `files` prop.
 */

const FILES_API = "/api/files";

const MAX_PATHS = 45;

/** Extensions the GitHub files API allows (must match app/api/files/route.ts). */
const LOADABLE_EXT = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".mjs", ".cjs"];

const FRONTEND_EXT = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".mjs", ".cjs"];

export type RepoFileLoaderFramework = "next" | "vite" | "react" | "vue" | "static";

export interface RepoFileLoaderParams {
  owner: string;
  repo: string;
  fileTree: string[];
  framework: RepoFileLoaderFramework;
}

export interface RepoFileLoaderResult {
  /** Files keyed by path (with leading / for Sandpack). Pass to Sandpack `files` prop. */
  files: Record<string, string>;
  /** Entry file paths that were included */
  entryPaths: string[];
  /** Frontend source paths that were included */
  frontendPaths: string[];
  /** Public asset paths that were included */
  publicPaths: string[];
  error?: string;
}

function hasExt(path: string, exts: string[]): boolean {
  const lower = path.toLowerCase();
  return lower === "package.json" || exts.some((ext) => lower.endsWith(ext));
}

function isLoadablePath(path: string): boolean {
  return hasExt(path, LOADABLE_EXT);
}

/**
 * Extract entry file paths (package.json, index.html, framework entrypoints).
 */
export function getEntryFilePaths(
  fileTree: string[],
  framework: RepoFileLoaderFramework
): string[] {
  const out: string[] = [];
  const lower = (p: string) => p.toLowerCase();

  const pkgJson = fileTree.find((p) => lower(p).endsWith("package.json"));
  if (pkgJson) out.push(pkgJson);

  if (framework === "next") {
    fileTree.filter((p) => lower(p).includes("next.config")).forEach((p) => out.push(p));
    const nextEntries = ["app/layout.tsx", "app/layout.js", "app/page.tsx", "app/page.js", "pages/_app.js", "pages/_app.tsx", "pages/index.js", "pages/index.tsx"];
    nextEntries.forEach((entry) => {
      const found = fileTree.find((p) => lower(p) === entry);
      if (found) out.push(found);
    });
  }

  if (framework === "vite" || framework === "vue") {
    const indexHtml = fileTree.find((p) => lower(p) === "index.html" || lower(p).endsWith("/index.html"));
    if (indexHtml) out.push(indexHtml);
    fileTree.filter((p) => lower(p).includes("vite.config")).forEach((p) => out.push(p));
    ["src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js"].forEach((entry) => {
      const found = fileTree.find((p) => lower(p) === entry);
      if (found) out.push(found);
    });
  }

  if (framework === "react") {
    const indexHtml = fileTree.find((p) => lower(p) === "index.html" || lower(p).endsWith("/index.html"));
    if (indexHtml) out.push(indexHtml);
    ["src/index.jsx", "src/index.js", "src/index.tsx", "src/index.ts", "index.jsx", "index.js"].forEach((entry) => {
      const found = fileTree.find((p) => lower(p) === entry);
      if (found) out.push(found);
    });
  }

  if (framework === "static") {
    fileTree.filter((p) => lower(p).endsWith("index.html")).forEach((p) => out.push(p));
  }

  return [...new Set(out)];
}

/**
 * Extract frontend source file paths (src/, app/, pages/, root configs).
 */
export function getFrontendFilePaths(
  fileTree: string[],
  framework: RepoFileLoaderFramework
): string[] {
  const allowed = fileTree.filter((p) => hasExt(p, FRONTEND_EXT));
  const priority: string[] = [];
  const rest: string[] = [];
  const lower = (p: string) => p.toLowerCase();

  for (const p of allowed) {
    const l = lower(p);
    if (l === "package.json" || l.endsWith("tsconfig.json")) priority.push(p);
    else if (framework === "next" && (l.startsWith("app/") || l.startsWith("pages/"))) priority.push(p);
    else if ((framework === "vite" || framework === "vue") && (l.startsWith("src/") || l === "index.html")) priority.push(p);
    else if (framework === "react" && (l.startsWith("src/") || l.startsWith("public/") || l === "index.html")) priority.push(p);
    else if (framework === "static") priority.push(p);
    else rest.push(p);
  }

  const seen = new Set(priority);
  for (const p of rest) {
    if (seen.has(p)) continue;
    seen.add(p);
    priority.push(p);
  }
  return priority.slice(0, MAX_PATHS);
}

/**
 * Extract public asset paths (files in public/ with loadable extensions).
 */
export function getPublicAssetPaths(fileTree: string[]): string[] {
  const lower = (p: string) => p.toLowerCase();
  return fileTree.filter(
    (p) => (lower(p).startsWith("public/") || lower(p).startsWith("public\\")) && isLoadablePath(p)
  );
}

/**
 * Build the full list of paths to load: entry + frontend + public (deduped, limited).
 */
export function getPathsForSandpack(
  fileTree: string[],
  framework: RepoFileLoaderFramework
): string[] {
  const entry = getEntryFilePaths(fileTree, framework);
  const frontend = getFrontendFilePaths(fileTree, framework);
  const publicAssets = getPublicAssetPaths(fileTree);

  const combined = [...entry];
  const set = new Set(entry);
  for (const p of frontend) {
    if (set.has(p)) continue;
    if (combined.length >= MAX_PATHS) break;
    set.add(p);
    combined.push(p);
  }
  for (const p of publicAssets) {
    if (set.has(p)) continue;
    if (combined.length >= MAX_PATHS) break;
    set.add(p);
    combined.push(p);
  }
  return combined.slice(0, MAX_PATHS);
}

/**
 * Normalize path for Sandpack: ensure leading slash.
 */
export function toSandpackPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Convert raw files (path -> content) to Sandpack format (keys with leading /).
 */
export function toSandpackFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    out[toSandpackPath(path)] = content;
  }
  return out;
}

/**
 * Load repository files from GitHub API and return them ready for Sandpack.
 * Extracts entry files, frontend files, and public assets; fetches contents; normalizes paths.
 */
export async function loadRepoFilesForSandpack(
  params: RepoFileLoaderParams
): Promise<RepoFileLoaderResult> {
  const { owner, repo, fileTree, framework } = params;

  const paths = getPathsForSandpack(fileTree, framework);
  const entryPaths = getEntryFilePaths(fileTree, framework).filter((p) => paths.includes(p));
  const frontendPaths = getFrontendFilePaths(fileTree, framework).filter((p) => paths.includes(p));
  const publicPaths = getPublicAssetPaths(fileTree).filter((p) => paths.includes(p));

  try {
    const res = await fetch(FILES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, paths }),
    });
    const data = (await res.json()) as { files?: Record<string, string>; error?: string };
    if (!res.ok || data.error) {
      return {
        files: {},
        entryPaths: [],
        frontendPaths: [],
        publicPaths: [],
        error: data.error ?? "Failed to load repo files",
      };
    }
    const rawFiles = data.files ?? {};
    const files = toSandpackFiles(rawFiles);
    return {
      files,
      entryPaths: entryPaths.filter((p) => rawFiles[p] != null),
      frontendPaths: frontendPaths.filter((p) => rawFiles[p] != null),
      publicPaths: publicPaths.filter((p) => rawFiles[p] != null),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load repo files";
    return {
      files: {},
      entryPaths: [],
      frontendPaths: [],
      publicPaths: [],
      error: message,
    };
  }
}
