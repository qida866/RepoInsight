import { fetchRepoMetadata } from "@/lib/github";

interface ParsedRepo {
  owner: string;
  repo: string;
}

export interface RepoSummary {
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
}

export interface RepoAnalyzerOutput {
  repoSummary: RepoSummary;
  techStack: string[];
  fileTree: string[];
  owner: string;
  repo: string;
}

// ReactFlow-compatible dependency graph types
export interface DependencyNode {
  id: string;
  data: { label: string };
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface RepoIntelligence {
  techStack: string[];
  entrypoints: string[];
  architecture: string[];
  dependencyGraph: DependencyGraph;
}

function parseGithubUrl(input: string): ParsedRepo | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
  } catch {
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length === 2) {
      return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
    }
    return null;
  }
}

async function fetchFileTree(owner: string, repo: string): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json"
      },
      next: { revalidate: 300 }
    }
  );

  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as { tree?: { path: string; type: string }[] };
  const tree = json.tree ?? [];

  return tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .sort();
}

export function detectTechStack(
  repoFiles: string[],
  packageJson?: string | null
): string[] {
  const techs = new Set<string>();

  const hasFile = (name: string) =>
    repoFiles.some((p) => p.toLowerCase().endsWith(name.toLowerCase()));

  // Language/platform hints from common files
  if (hasFile("package.json")) {
    techs.add("JavaScript");
    techs.add("Node.js");
  }
  if (hasFile("requirements.txt")) techs.add("Python");
  if (hasFile("go.mod")) techs.add("Go");
  if (hasFile("pom.xml")) techs.add("Java");

  // Parse package.json dependencies/devDependencies when available
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const depNames = new Set(
        Object.keys(pkg.dependencies ?? {}).concat(
          Object.keys(pkg.devDependencies ?? {})
        ).map((d) => d.toLowerCase())
      );

      const hasDep = (name: string | string[]) => {
        if (Array.isArray(name)) {
          return name.some((n) => depNames.has(n.toLowerCase()));
        }
        return depNames.has(name.toLowerCase());
      };

      // Frameworks
      if (hasDep(["react", "react-dom"])) techs.add("React");
      if (hasDep("next")) techs.add("Next.js");
      if (hasDep("vue") || hasDep("vue-router")) techs.add("Vue");
      if (hasDep("@angular/core") || hasDep("@angular/cli")) techs.add("Angular");
      if (hasDep("express")) techs.add("Express");
      if (hasDep("django")) techs.add("Django");
      if (hasDep("fastapi")) techs.add("FastAPI");
      if (
        hasDep("spring-boot") ||
        hasDep("@nestjs/core") || // often used for Spring-like architectures
        hasDep("spring")
      ) {
        techs.add("Spring");
      }

      // Tooling
      if (hasDep("tailwindcss")) techs.add("Tailwind CSS");
      if (hasDep(["@prisma/client", "prisma"])) techs.add("Prisma");
      if (hasDep(["@reduxjs/toolkit", "redux", "react-redux"])) techs.add("Redux");
      if (hasDep("vite")) techs.add("Vite");
      if (hasDep("webpack")) techs.add("Webpack");
    } catch {
      // ignore malformed package.json, fall back to path heuristics below
    }
  }

  const allPaths = repoFiles.join("\n").toLowerCase();

  // Path-based heuristics (supports cases where package.json isn't available)
  if (allPaths.includes("next.config") || allPaths.includes("next/")) {
    techs.add("Next.js");
    techs.add("React");
  } else if (allPaths.includes("react")) {
    techs.add("React");
  }

  if (allPaths.includes("express")) techs.add("Express");
  if (allPaths.includes("django")) techs.add("Django");
  if (allPaths.includes("fastapi")) techs.add("FastAPI");
  if (allPaths.includes("tailwind.config")) techs.add("Tailwind CSS");
  if (allPaths.includes("prisma/")) techs.add("Prisma");
  if (allPaths.includes("redux")) techs.add("Redux");
  if (allPaths.includes("vite.config")) techs.add("Vite");
  if (allPaths.includes("webpack.config")) techs.add("Webpack");
  if (allPaths.includes("spring-boot") || allPaths.includes("springframework")) {
    techs.add("Spring");
  }

  return Array.from(techs);
}

export function detectEntrypoints(fileTree: string[]): string[] {
  const entries = new Set<string>();
  const has = (path: string) =>
    fileTree.some((p) => p.toLowerCase() === path.toLowerCase());

  // Typical TS/JS entry files
  [
    "index.ts",
    "index.tsx",
    "index.js",
    "main.ts",
    "main.tsx",
    "main.js",
    "app.tsx",
    "app.ts",
    "app.js"
  ].forEach((p) => {
    if (has(p)) entries.add(p);
  });

  // Node / server entrypoints
  ["server.ts", "server.js", "src/server.ts", "src/server.js"].forEach((p) => {
    if (has(p)) entries.add(p);
  });

  // Python entrypoints
  ["main.py", "app.py"].forEach((p) => {
    if (has(p)) entries.add(p);
  });

  // CLI-style entrypoints
  ["cli.ts", "cli.js"].forEach((p) => {
    if (has(p)) entries.add(p);
  });

  // bin/* executables
  fileTree
    .filter((p) => p.startsWith("bin/") || p.includes("/bin/"))
    .forEach((p) => entries.add(p));

  return Array.from(entries);
}

export function inferArchitecture(fileTree: string[]): string[] {
  const lower = fileTree.map((p) => p.toLowerCase());
  const hasAny = (predicates: ((p: string) => boolean)[]) =>
    lower.some((p) => predicates.some((fn) => fn(p)));

  const modules = new Set<string>();

  // Frontend: typical web UI folders/files
  if (
    hasAny([
      (p) => p.startsWith("app/"),
      (p) => p.startsWith("pages/"),
      (p) => p.startsWith("src/components"),
      (p) => p.includes("components/"),
      (p) => p.includes("ui/"),
      (p) => p.endsWith(".tsx"),
      (p) => p.endsWith(".jsx")
    ])
  ) {
    modules.add("frontend");
  }

  // API: HTTP routing / controllers
  if (
    hasAny([
      (p) => p.includes("/api/"),
      (p) => p.startsWith("app/api"),
      (p) => p.startsWith("pages/api"),
      (p) => p.includes("controllers/"),
      (p) => p.includes("routes/"),
      (p) => p.includes("router/"),
      (p) => p.endsWith("router.ts") || p.endsWith("router.js")
    ])
  ) {
    modules.add("api");
  }

  // Backend / service layer
  if (
    hasAny([
      (p) => p.includes("server/"),
      (p) => p.includes("backend/"),
      (p) => p.includes("services/"),
      (p) => p.includes("usecase"),
      (p) => p.includes("domain/"),
      (p) => p.includes("handlers/"),
      (p) => p.includes("application/")
    ])
  ) {
    modules.add("backend");
  }

  // Database / persistence
  if (
    hasAny([
      (p) => p.includes("prisma/"),
      (p) => p.includes("migrations/"),
      (p) => p.includes("entities/"),
      (p) => p.includes("repositories/"),
      (p) => p.includes("models/"),
      (p) => p.includes("db/"),
      (p) => p.endsWith(".sql")
    ])
  ) {
    modules.add("database");
  }

  // Utilities / shared helpers
  if (
    hasAny([
      (p) => p.includes("utils/"),
      (p) => p.includes("lib/"),
      (p) => p.includes("helpers/"),
      (p) => p.includes("shared/")
    ])
  ) {
    modules.add("utils");
  }

  // Assets: static assets and public files
  if (
    hasAny([
      (p) => p.startsWith("public/"),
      (p) => p.startsWith("static/"),
      (p) => p.includes("/assets/"),
      (p) => p.includes("/images/"),
      (p) => p.includes("/icons/"),
      (p) => p.endsWith(".css"),
      (p) => p.endsWith(".scss"),
      (p) => p.endsWith(".png"),
      (p) => p.endsWith(".jpg"),
      (p) => p.endsWith(".jpeg"),
      (p) => p.endsWith(".svg")
    ])
  ) {
    modules.add("assets");
  }

  // Config: configuration and environment
  if (
    hasAny([
      (p) => p.startsWith("config/"),
      (p) => p.includes("/config/"),
      (p) => p.endsWith(".config.ts"),
      (p) => p.endsWith(".config.js"),
      (p) => p.endsWith(".config.cjs"),
      (p) => p.endsWith(".config.mjs"),
      (p) => p.endsWith("config.yml") || p.endsWith("config.yaml"),
      (p) => p.endsWith(".env") || p.includes(".env.")
    ])
  ) {
    modules.add("config");
  }

  // Background workers / jobs / queues
  if (
    hasAny([
      (p) => p.includes("workers/"),
      (p) => p.includes("jobs/"),
      (p) => p.includes("queues/"),
      (p) => p.includes("cron/"),
      (p) => p.endsWith(".worker.ts") || p.endsWith(".worker.js")
    ])
  ) {
    modules.add("workers");
  }

  if (modules.size === 0) {
    modules.add("monolith");
  }

  return Array.from(modules);
}

/** Resolve a relative import spec (e.g. '../api/client', './service') against the file path. */
function resolveRelativePath(spec: string, fromFilePath: string): string {
  const dir = fromFilePath.includes("/") ? fromFilePath.replace(/\/[^/]+$/, "") : "";
  const parts = spec.split("/").filter(Boolean);
  const stack = dir ? dir.split("/") : [];

  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") {
      stack.pop();
      continue;
    }
    stack.push(p);
  }

  return stack.join("/");
}

/** Find a file in pathSet that matches the resolved path (with or without extension). */
function resolveToFile(
  resolved: string,
  pathSet: Set<string>
): string | null {
  const lowerResolved = resolved.toLowerCase();
  const candidates = [
    resolved,
    ...["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((ext) => resolved + ext),
    ...["/index.ts", "/index.tsx", "/index.js", "/index.jsx"].map((suffix) => resolved + suffix)
  ];

  for (const c of candidates) {
    const found = Array.from(pathSet).find((p) => p === c || p.toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  const byEnd = Array.from(pathSet).find((p) => p === resolved || p.endsWith("/" + resolved));
  if (byEnd) return byEnd;
  const byEndExt = Array.from(pathSet).find((p) => {
    const r = resolved.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, "");
    return p === r || p.endsWith("/" + r) || p.endsWith(r + ".ts") || p.endsWith(r + ".tsx") || p.endsWith(r + ".js") || p.endsWith(r + ".jsx");
  });
  return byEndExt ?? null;
}

export function buildDependencyGraph(
  fileContents: Record<string, string>
): DependencyGraph {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const edgeSet = new Set<string>();

  const addNode = (id: string) => {
    if (!nodes.find((n) => n.id === id)) {
      nodes.push({ id, data: { label: id } });
    }
  };

  const filePaths = Object.keys(fileContents);
  const pathSet = new Set(filePaths);

  // import x from './path' | import 'path' | require('path') | export ... from 'path' | dynamic import('path')
  const importRegex =
    /(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?|export\s+(?:\{[^}]*\}|\*)\s+from\s+|import\s*\(\s*)['"]([^'";]+)['"]|require\s*\(\s*['"]([^'";]+)['"]\s*\)/g;

  for (const path of filePaths) {
    const content = fileContents[path] ?? "";
    addNode(path);

    const matches = content.matchAll(importRegex);
    for (const match of matches) {
      const spec = (match[1] ?? match[2] ?? "").trim();
      if (!spec || spec.startsWith("http") || spec.startsWith("node:") || spec.startsWith("react") || spec.startsWith("next")) continue;

      if (spec.startsWith(".") || spec.startsWith("/")) {
        const resolved = resolveRelativePath(spec, path);
        const candidate = resolveToFile(resolved, pathSet);
        const targetId = candidate ?? resolved;

        addNode(targetId);
        const edgeKey = `${path}->${targetId}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: edgeKey,
            source: path,
            target: targetId
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export function buildRepoIntelligence(params: {
  fileTree: string[];
  packageJson?: string | null;
  fileContents?: Record<string, string>;
}): RepoIntelligence {
  const techStack = detectTechStack(params.fileTree, params.packageJson);
  const entrypoints = detectEntrypoints(params.fileTree);
  const architecture = inferArchitecture(params.fileTree);
  const dependencyGraph = buildDependencyGraph(params.fileContents ?? {});

  return {
    techStack,
    entrypoints,
    architecture,
    dependencyGraph
  };
}

export async function analyzeGithubRepository(
  repoUrl: string
): Promise<RepoAnalyzerOutput> {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL");
  }

  const { owner, repo } = parsed;

  const [meta, filePaths] = await Promise.all([
    fetchRepoMetadata(owner, repo),
    fetchFileTree(owner, repo)
  ]);

  const techStack = detectTechStack(filePaths);

  const repoSummary: RepoSummary = {
    name: meta.name,
    description: meta.description,
    stars: meta.stars,
    language: meta.language ?? null,
    topics: meta.topics ?? []
  };

  const fileTree = filePaths;

  return {
    repoSummary,
    techStack,
    fileTree,
    owner,
    repo
  };
}

