interface QuickStartGuidePanelProps {
  fileTree: string[];
  techStack: string[];
  repoUrl?: string;
}

function hasPathEnding(fileTree: string[], ending: string): boolean {
  const lowerEnding = ending.toLowerCase();
  return fileTree.some((p) => p.toLowerCase().endsWith(lowerEnding));
}

export default function QuickStartGuidePanel({
  fileTree,
  techStack,
  repoUrl
}: QuickStartGuidePanelProps) {
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

  const steps: string[] = [];

  const repoClone =
    repoUrl && repoUrl.startsWith("http")
      ? `git clone ${repoUrl}`
      : "git clone <this-repository-url>";

  steps.push(repoClone, "cd <repo-folder>");

  switch (runtime) {
    case "next":
      steps.push(
        "Ensure Node.js (LTS) and npm or pnpm are installed.",
        "Install dependencies with `npm install`.",
        "Start the dev server with `npm run dev`.",
        "Open the printed localhost URL in your browser."
      );
      break;
    case "vite":
      steps.push(
        "Ensure Node.js and npm/pnpm/yarn are installed.",
        "Install dependencies with `npm install`.",
        "Start the Vite dev server with `npm run dev`.",
        "Visit the printed localhost URL in your browser."
      );
      break;
    case "node":
      steps.push(
        "Ensure Node.js is installed.",
        hasPackageJson
          ? "Install dependencies with `npm install`."
          : "Install any required dependencies (check package.json if present).",
        "Start the server with `node server.js`.",
        "Call the exposed HTTP endpoint from your browser or API client."
      );
      break;
    case "python":
      steps.push(
        "Ensure Python 3 is installed.",
        "Create and activate a virtual environment (optional but recommended).",
        hasRequirements
          ? "Install dependencies with `pip install -r requirements.txt`."
          : "Install project dependencies (see README or pyproject.toml).",
        "Run the main module with `python main.py` (or `python app.py` if that is the entrypoint)."
      );
      break;
    default:
      steps.push(
        "Open the README to check for project-specific setup instructions.",
        "Look for package.json, requirements.txt, or Docker files to identify the runtime.",
        "Install dependencies as documented, then run the documented dev or start command."
      );
      break;
  }

  return (
    <section className="glass-panel transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Quick start guide
        </h2>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-200">
        {steps.map((step, i) => (
          <li key={i} className="leading-relaxed">
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

