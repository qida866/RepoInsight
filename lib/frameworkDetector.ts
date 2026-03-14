/**
 * FrameworkDetector — analyzes repository files and determines the framework.
 *
 * Checks: package.json, requirements.txt, pyproject.toml, go.mod, pom.xml
 * Detects: Next.js, React, Vite, Vue, Express, Flask, FastAPI, Static HTML
 *
 * Returns: { framework: string, demoMode: "frontend" | "node" | "python" | "static" | "unsupported" }
 */

export type DemoMode = "frontend" | "node" | "python" | "static" | "unsupported";

export interface FrameworkDetectionResult {
  framework: string;
  demoMode: DemoMode;
}

/** Internal runtime id used by DemoEngine for path picking and Sandpack template. */
export type FrameworkRuntime =
  | "next"
  | "vite"
  | "react"
  | "vue"
  | "node-server"
  | "python"
  | "static"
  | "unknown";

export interface FrameworkResult {
  framework: FrameworkRuntime;
  label: string;
}

export interface DemoModeResult {
  mode: DemoMode;
  framework: FrameworkRuntime;
  label: string;
}

export interface FrameworkDetectorParams {
  fileTree: string[];
  techStack?: string[];
  packageJson?: string | null;
  requirementsTxt?: string | null;
  pyprojectToml?: string | null;
  hasGoMod?: boolean;
  hasPomXml?: boolean;
}

function hasFile(fileTree: string[], name: string): boolean {
  const lower = name.toLowerCase();
  return fileTree.some((p) => p.toLowerCase().endsWith(lower));
}

function hasPath(fileTree: string[], predicate: (path: string) => boolean): boolean {
  return fileTree.some((p) => predicate(p.toLowerCase()));
}

/**
 * Analyzes repository files and returns the detected framework and demo mode.
 * Checks package.json, requirements.txt, pyproject.toml, go.mod, pom.xml.
 */
export function detectFramework(params: FrameworkDetectorParams): FrameworkDetectionResult {
  const {
    fileTree,
    techStack = [],
    packageJson,
    requirementsTxt,
    pyprojectToml,
  } = params;

  const hasPackageJson = hasFile(fileTree, "package.json");
  const hasRequirementsTxt = hasFile(fileTree, "requirements.txt");
  const hasPyprojectToml = hasFile(fileTree, "pyproject.toml");
  const hasGoMod = params.hasGoMod ?? hasFile(fileTree, "go.mod");
  const hasPomXml = params.hasPomXml ?? hasFile(fileTree, "pom.xml");

  const hasNextConfig = hasPath(fileTree, (p) => p.includes("next.config"));
  const hasViteConfig = hasPath(fileTree, (p) => p.includes("vite.config"));
  const hasVueFile = hasPath(fileTree, (p) => p.endsWith(".vue"));
  const hasNodeServer = hasPath(fileTree, (p) => p === "server.js" || p.endsWith("/server.js"));
  const hasNodeIndex = hasPath(fileTree, (p) => p === "index.js" || p.endsWith("/index.js"));
  const hasPythonEntry = hasPath(fileTree, (p) => p.endsWith("main.py") || p.endsWith("app.py"));
  const hasIndexHtml = hasFile(fileTree, "index.html") || hasPath(fileTree, (p) => p.endsWith("/index.html"));
  const onlyStaticAssets = !hasPackageJson && !hasRequirementsTxt && !hasPyprojectToml && !hasGoMod && !hasPomXml;

  const hasTech = (name: string) =>
    techStack.some((t) => t.toLowerCase().includes(name.toLowerCase()));

  // --- Static HTML ---
  if (onlyStaticAssets && hasIndexHtml) {
    return { framework: "Static HTML", demoMode: "static" };
  }

  // --- package.json (Next.js, React, Vite, Vue, Express) ---
  if (hasPackageJson) {
    let hasNext = hasTech("Next.js") || hasNextConfig;
    let hasVite = hasTech("Vite") || hasViteConfig;
    let hasReact = hasTech("React");
    let hasVue = hasTech("Vue") || hasVueFile;
    let hasExpress = false;

    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const deps = new Set(
          [
            ...Object.keys(pkg.dependencies ?? {}),
            ...Object.keys(pkg.devDependencies ?? {}),
          ].map((d) => d.toLowerCase())
        );
        if (!hasNext) hasNext = deps.has("next");
        if (!hasVite) hasVite = deps.has("vite");
        if (!hasReact) hasReact = deps.has("react") || deps.has("react-dom");
        if (!hasVue) hasVue = deps.has("vue");
        hasExpress = deps.has("express");
      } catch {
        // use path/techStack only
      }
    }

    if (hasNext) return { framework: "Next.js", demoMode: "frontend" };
    if (hasVite && hasVue) return { framework: "Vue", demoMode: "frontend" };
    if (hasVite) return { framework: "Vite", demoMode: "frontend" };
    if (hasReact) return { framework: "React", demoMode: "frontend" };
    if (hasExpress || hasNodeServer || hasNodeIndex) {
      return { framework: "Express", demoMode: "node" };
    }
    return { framework: "Node.js", demoMode: "node" };
  }

  // --- requirements.txt / pyproject.toml (Flask, FastAPI) ---
  if (hasRequirementsTxt || hasPyprojectToml || hasPythonEntry) {
    const content = (requirementsTxt ?? "") + (pyprojectToml ?? "");
    const lower = content.toLowerCase();
    if (lower.includes("flask")) return { framework: "Flask", demoMode: "python" };
    if (lower.includes("fastapi")) return { framework: "FastAPI", demoMode: "python" };
    if (lower.includes("django")) return { framework: "Django", demoMode: "python" };
    return { framework: "Python", demoMode: "python" };
  }

  // --- go.mod / pom.xml ---
  if (hasGoMod) return { framework: "Go", demoMode: "unsupported" };
  if (hasPomXml) return { framework: "Java", demoMode: "unsupported" };

  return { framework: "Unknown", demoMode: "unsupported" };
}

/** Map display framework name to internal runtime id (for DemoEngine). */
const FRAMEWORK_TO_RUNTIME: Record<string, FrameworkRuntime> = {
  "Next.js": "next",
  "Vite": "vite",
  "React": "react",
  "Vue": "vue",
  "Express": "node-server",
  "Node.js": "node-server",
  "Static HTML": "static",
  "Flask": "python",
  "FastAPI": "python",
  "Django": "python",
  "Python": "python",
  "Go": "unknown",
  "Java": "unknown",
  "Unknown": "unknown",
};

/**
 * Returns demo mode + runtime id + label for DemoEngine/DemoRunner.
 * Use detectFramework() when you only need { framework: string, demoMode }.
 */
export function getDemoMode(params: FrameworkDetectorParams): DemoModeResult {
  const { framework: label, demoMode } = detectFramework(params);
  const framework = FRAMEWORK_TO_RUNTIME[label] ?? "unknown";
  return { mode: demoMode, framework, label };
}
