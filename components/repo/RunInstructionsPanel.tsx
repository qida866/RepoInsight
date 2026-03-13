import type React from "react";

interface RunInstructionsPanelProps {
  fileTree: string[];
  techStack: string[];
}

function hasPathEnding(fileTree: string[], ending: string): boolean {
  const lowerEnding = ending.toLowerCase();
  return fileTree.some((p) => p.toLowerCase().endsWith(lowerEnding));
}

export default function RunInstructionsPanel({
  fileTree,
  techStack
}: RunInstructionsPanelProps): React.JSX.Element {
  const lowerTree = fileTree.map((p) => p.toLowerCase());
  const hasAny = (predicates: ((p: string) => boolean)[]) =>
    lowerTree.some((p) => predicates.some((fn) => fn(p)));

  const hasPackageJson = hasPathEnding(fileTree, "package.json");
  const hasNextConfig = hasAny([(p) => p.includes("next.config")]);
  const hasViteConfig = hasAny([(p) => p.includes("vite.config")]);
  const hasRequirements = hasPathEnding(fileTree, "requirements.txt");
  const hasPythonMain = hasAny([
    (p) => p.endsWith("main.py"),
    (p) => p.endsWith("app.py")
  ]);
  const hasNodeServer = hasAny([
    (p) => p === "server.js" || p.endsWith("/server.js")
  ]);

  const hasTech = (name: string) =>
    techStack.some((t) => t.toLowerCase() === name.toLowerCase());

  type Runtime = "next" | "vite" | "node" | "python" | "unknown";

  let runtime: Runtime = "unknown";

  if (hasTech("Next.js") || hasNextConfig) {
    runtime = "next";
  } else if (hasTech("Vite") || hasViteConfig) {
    runtime = "vite";
  } else if (hasNodeServer) {
    runtime = "node";
  } else if (hasRequirements || hasPythonMain) {
    runtime = "python";
  }

  let title = "Run instructions";
  let commands: string[] = [];

  switch (runtime) {
    case "next":
      title = "Run this Next.js repo";
      commands = ["npm install", "npm run dev"];
      break;
    case "vite":
      title = "Run this React Vite repo";
      commands = ["npm install", "npm run dev"];
      break;
    case "node":
      title = "Run this Node server";
      commands = ["npm install", "node server.js"];
      break;
    case "python":
      title = "Run this Python app";
      commands = ["pip install -r requirements.txt", "python main.py"];
      break;
    default:
      title = "Run this repository";
      commands = [];
      break;
  }

  return (
    <section className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Run instructions
        </h2>
      </div>
      <div className="space-y-2 text-xs text-slate-200">
        <p className="text-[11px] font-medium text-slate-100">{title}</p>
        {commands.length ? (
          <>
            <p className="text-[11px] text-slate-400">
              Run these commands from the repository root:
            </p>
            <ul className="space-y-1">
              {commands.map((cmd) => (
                <li key={cmd} className="font-mono text-[10px] text-slate-100">
                  {cmd}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[11px] text-slate-400">
            Run instructions are not obvious from the tree alone. Check the README and
            any package.json, requirements.txt, or Docker files for precise commands.
          </p>
        )}
      </div>
    </section>
  );
}

