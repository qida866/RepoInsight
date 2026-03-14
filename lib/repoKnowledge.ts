import type { AnalyzeResult } from "@/types/analyze";
import { getDetectedLayerLabels } from "@/components/repo/ArchitectureMapPanel";

export interface RepoKnowledge {
  repoSummary: string;
  architectureLayers: string[];
  techStack: string[];
  entryPoints: string[];
  importantFolders: string[];
  importantFiles: string[];
  /** Full file tree (sample) for context */
  fileTreeSample: string[];
  name: string;
  description: string | null;
}

const ENTRY_PATTERNS = [
  "app/page.tsx",
  "app/page.js",
  "app/layout.tsx",
  "app/layout.js",
  "src/app.tsx",
  "src/app.jsx",
  "src/main.tsx",
  "src/main.ts",
  "src/main.jsx",
  "src/main.js",
  "src/index.tsx",
  "src/index.ts",
  "src/index.jsx",
  "src/index.js",
  "pages/_app.tsx",
  "pages/_app.js",
  "pages/index.tsx",
  "pages/index.js",
  "server.js",
  "index.js",
  "main.py",
  "app.py",
  "index.html"
];

const IMPORTANT_FILE_PATTERNS = [
  "readme.md",
  "readme",
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "next.config",
  "vite.config",
  "vue.config",
  "webpack.config",
  "dockerfile",
  "docker-compose",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "cargo.toml",
  ".env.example",
  "contributing.md",
  "license"
];

function getTopLevelFolders(fileTree: string[]): string[] {
  const set = new Set<string>();
  for (const path of fileTree) {
    const first = path.split("/")[0];
    if (first && first !== path) set.add(first);
  }
  return Array.from(set).sort();
}

function getMeaningfulFolders(fileTree: string[]): string[] {
  const lower = (s: string) => s.toLowerCase();
  const priority = ["app", "src", "packages", "lib", "libs", "pages", "components", "api", "server", "services", "config", "public", "tests", "docs"];
  const fromTree = getTopLevelFolders(fileTree);
  const ordered: string[] = [];
  for (const p of priority) {
    if (fromTree.some((f) => lower(f) === p)) ordered.push(p);
  }
  for (const f of fromTree.sort()) {
    if (!priority.includes(lower(f))) ordered.push(f);
  }
  return ordered.slice(0, 20);
}

function getEntryPointsFromTree(fileTree: string[]): string[] {
  const lower = (s: string) => s.toLowerCase();
  return fileTree.filter((p) =>
    ENTRY_PATTERNS.some((ep) => lower(p) === ep || lower(p).endsWith("/" + ep))
  );
}

function getImportantFilesFromTree(fileTree: string[]): string[] {
  const lower = (s: string) => s.toLowerCase();
  const out: string[] = [];
  for (const p of fileTree) {
    const base = p.split("/").pop() ?? p;
    const l = lower(base);
    const full = lower(p);
    if (ENTRY_PATTERNS.some((ep) => full === ep || full.endsWith("/" + ep))) {
      out.push(p);
      continue;
    }
    if (IMPORTANT_FILE_PATTERNS.some((pat) => l === pat || l.startsWith(pat) || l.endsWith(pat))) {
      out.push(p);
    }
  }
  return [...new Set(out)].slice(0, 40);
}

/**
 * Build structured knowledge about a repository from its analysis result.
 * Use this to power RepoChatPanel and other AI context.
 */
export function buildRepoKnowledge(result: AnalyzeResult): RepoKnowledge {
  const fileTree = result.fileTree ?? [];
  const entryPoints = getEntryPointsFromTree(fileTree);
  const importantFolders = getMeaningfulFolders(fileTree);
  const importantFiles = getImportantFilesFromTree(fileTree);
  const architectureLayers = getDetectedLayerLabels(fileTree);

  return {
    name: result.name,
    description: result.description,
    repoSummary: result.summary?.trim() ?? result.description?.trim() ?? "",
    architectureLayers,
    techStack: result.techStack ?? [],
    entryPoints,
    importantFolders,
    importantFiles,
    fileTreeSample: fileTree.slice(0, 200)
  };
}
