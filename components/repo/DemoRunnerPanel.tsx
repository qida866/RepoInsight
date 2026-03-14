"use client";

import { useMemo, useState } from "react";
import {
  getDemoMode,
  loadRepoFiles,
  pickPathsForDemo,
  getSandpackTemplate,
  isRunnableInBrowser,
  type SandpackTemplateId,
} from "@/lib/demoEngine";
import type { FrameworkRuntime } from "@/lib/frameworkDetector";

function hasPathEnding(fileTree: string[], ending: string): boolean {
  const lowerEnding = ending.toLowerCase();
  return fileTree.some((p) => p.toLowerCase().endsWith(lowerEnding));
}

interface DemoRunnerPanelProps {
  owner: string;
  repo: string;
  fileTree: string[];
  techStack: string[];
  onOpenSandpack: (data: { template: SandpackTemplateId; files: Record<string, string> }) => void;
}

export default function DemoRunnerPanel({
  owner,
  repo,
  fileTree,
  techStack,
  onOpenSandpack
}: DemoRunnerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mode, framework, label: frameworkLabel } = useMemo(
    () => getDemoMode({ fileTree, techStack }),
    [fileTree, techStack]
  );

  const hasPackageJson = hasPathEnding(fileTree, "package.json");
  const hasRequirements = hasPathEnding(fileTree, "requirements.txt");
  const hasPyproject = hasPathEnding(fileTree, "pyproject.toml");
  const hasNodeServer = fileTree.some(
    (p) => p.toLowerCase().endsWith("/server.js") || p.toLowerCase() === "server.js"
  );
  const hasPythonEntrypoint = fileTree.some(
    (p) => p.toLowerCase().endsWith("main.py") || p.toLowerCase().endsWith("app.py")
  );

  const runInstructions: string[] = [];
  const requiredCommands: string[] = [];
  const setupSteps: string[] = [];

  const runtime: FrameworkRuntime = framework;

  switch (runtime) {
    case "next":
      runInstructions.push("Run the Next.js dev server on localhost.");
      requiredCommands.push("npm install", "npm run dev");
      setupSteps.push(
        "Ensure Node.js and npm (or pnpm/yarn) are installed.",
        "Install dependencies with `npm install`.",
        "Start the dev server with `npm run dev` and open the printed URL in your browser."
      );
      break;
    case "vite":
    case "vue":
      runInstructions.push(runtime === "vue" ? "Run the Vite-powered Vue dev server." : "Run the Vite-powered React dev server.");
      requiredCommands.push("npm install", "npm run dev");
      setupSteps.push(
        "Install Node.js and a package manager (npm, pnpm, or yarn).",
        "Install dependencies with `npm install`.",
        "Run `npm run dev` to start the Vite dev server and visit the printed URL."
      );
      break;
    case "react":
      runInstructions.push("Start the React app using the package.json scripts.");
      requiredCommands.push("npm install", "npm start");
      setupSteps.push(
        "Install Node.js and npm.",
        "Run `npm install` to install dependencies.",
        "Run `npm start` (or the equivalent script in package.json) to launch the dev server."
      );
      break;
    case "static":
      runInstructions.push("Open index.html in a browser or use a static server.");
      requiredCommands.push("npx serve .  # or open index.html");
      setupSteps.push("Open index.html directly or run a static file server (e.g. npx serve).");
      break;
    case "node-server":
      runInstructions.push("Start the Node.js HTTP server entrypoint.");
      requiredCommands.push(
        hasPackageJson ? "npm install" : "npm install (if package.json exists)",
        hasNodeServer ? "node server.js" : "node index.js"
      );
      setupSteps.push(
        "Install Node.js.",
        "Install dependencies with `npm install` if a package.json is present.",
        `Start the server with \`${hasNodeServer ? "node server.js" : "node index.js"}\` and hit the exposed port.`
      );
      break;
    case "python":
      runInstructions.push("Run the Python application entry module.");
      requiredCommands.push(
        "python -m venv .venv  # optional but recommended",
        hasRequirements
          ? "pip install -r requirements.txt"
          : hasPyproject
          ? "pip install -e .  # or use your chosen pyproject tool"
          : "pip install -r requirements.txt  # adjust to your environment",
        hasPythonEntrypoint ? "python main.py  # or python app.py" : "python <entry>.py"
      );
      setupSteps.push(
        "Install Python 3 and create a virtual environment.",
        "Install dependencies from requirements.txt or pyproject.toml.",
        "Identify the main module (e.g. main.py or app.py) and run it with `python <file>.py`."
      );
      break;
    default:
      runInstructions.push(
        "Run instructions are not obvious from the tree alone. Check README and package scripts."
      );
      setupSteps.push(
        "Open README and any docs for environment/setup instructions.",
        "Look for package.json, requirements.txt, or Docker files to infer runtime and commands.",
        "Identify main entrypoints (web, server, or CLI) and follow their imports."
      );
      break;
  }

  const canRun = isRunnableInBrowser(mode);

  const handleRunDemo = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const paths = pickPathsForDemo(mode, framework, fileTree);
      const { files, error: loadError } = await loadRepoFiles({ owner, repo, paths });
      if (loadError) {
        setError(loadError);
        return;
      }
      const template = getSandpackTemplate(mode, framework, fileTree);
      onOpenSandpack({ template, files });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Demo runner
        </h2>
        {canRun && (
          <button
            type="button"
            onClick={handleRunDemo}
            disabled={loading}
            className="rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Run Demo"}
          </button>
        )}
      </div>
      {error && (
        <p className="mb-2 text-[11px] text-red-400">{error}</p>
      )}
      <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-200">
        <div>
          <div className="mb-1 text-[11px] font-medium text-slate-300">
            Detected runtime
          </div>
          <p className="text-[11px] text-slate-100">
            {frameworkLabel}
          </p>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-slate-300">
            Required commands
          </div>
          {requiredCommands.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Inspect README and package scripts for exact commands.
            </p>
          ) : (
            <ul className="space-y-1">
              {requiredCommands.map((cmd) => (
                <li key={cmd} className="font-mono text-[10px] text-slate-100">
                  {cmd}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-slate-300">
            Setup steps
          </div>
          <ol className="space-y-1 text-[11px] text-slate-300">
            {setupSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
