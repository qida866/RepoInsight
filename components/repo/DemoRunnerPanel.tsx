import type React from "react";

interface DemoRunnerPanelProps {
  fileTree: string[];
  techStack: string[];
}

function hasPathEnding(fileTree: string[], ending: string): boolean {
  const lowerEnding = ending.toLowerCase();
  return fileTree.some((p) => p.toLowerCase().endsWith(lowerEnding));
}

export default function DemoRunnerPanel({
  fileTree,
  techStack
}: DemoRunnerPanelProps): React.JSX.Element {
  const lowerTree = fileTree.map((p) => p.toLowerCase());
  const hasAny = (predicates: ((p: string) => boolean)[]) =>
    lowerTree.some((p) => predicates.some((fn) => fn(p)));

  const hasPackageJson = hasPathEnding(fileTree, "package.json");
  const hasViteConfig = hasAny([(p) => p.includes("vite.config")]);
  const hasNextConfig = hasAny([(p) => p.includes("next.config")]);
  const hasNodeServer = hasAny([
    (p) => p.endsWith("/server.js"),
    (p) => p === "server.js"
  ]);
  const hasNodeIndex = hasAny([
    (p) => p.endsWith("/index.js"),
    (p) => p === "index.js"
  ]);
  const hasRequirements = hasPathEnding(fileTree, "requirements.txt");
  const hasPyproject = hasPathEnding(fileTree, "pyproject.toml");
  const hasPythonEntrypoint = hasAny([
    (p) => p.endsWith("main.py"),
    (p) => p.endsWith("app.py")
  ]);

  const hasTech = (name: string) =>
    techStack.some((t) => t.toLowerCase() === name.toLowerCase());

  type Runtime =
    | "next"
    | "vite"
    | "react"
    | "node-server"
    | "python"
    | "unknown";

  let runtime: Runtime = "unknown";

  if (hasTech("Next.js") || hasNextConfig) {
    runtime = "next";
  } else if (hasTech("Vite") || hasViteConfig) {
    runtime = "vite";
  } else if (hasTech("React") && hasPackageJson) {
    runtime = "react";
  } else if (hasNodeServer || hasNodeIndex) {
    runtime = "node-server";
  } else if (hasRequirements || hasPyproject || hasPythonEntrypoint) {
    runtime = "python";
  }

  const runInstructions: string[] = [];
  const requiredCommands: string[] = [];
  const setupSteps: string[] = [];

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
      runInstructions.push("Run the Vite-powered React dev server.");
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

  return (
    <section className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Demo runner
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-200">
        <div>
          <div className="mb-1 text-[11px] font-medium text-slate-300">
            Detected runtime
          </div>
          <p className="text-[11px] text-slate-100">
            {runtime === "next"
              ? "Next.js application"
              : runtime === "vite"
              ? "Vite-powered React app"
              : runtime === "react"
              ? "React SPA"
              : runtime === "node-server"
              ? "Node.js server"
              : runtime === "python"
              ? "Python application"
              : "Not clearly detectable from the current tree"}
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

