"use client";

interface QuickStartGuidePanelProps {
  fileTree: string[];
  techStack: string[];
  repoUrl?: string;
}

function hasPathEnding(fileTree: string[], ending: string): boolean {
  const lowerEnding = ending.toLowerCase();
  return fileTree.some((p) => p.toLowerCase().endsWith(lowerEnding));
}

type Runtime = "next" | "vite" | "react" | "node" | "python" | "go" | "unknown";

interface Step {
  title: string;
  content: string | string[];
  isCode?: boolean;
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
  const hasPyproject = hasPathEnding(fileTree, "pyproject.toml");
  const hasGoMod = hasPathEnding(fileTree, "go.mod");
  const hasPythonMain = hasAny([
    (p) => p.endsWith("main.py"),
    (p) => p.endsWith("app.py")
  ]);
  const hasNodeServer = hasAny([
    (p) => p === "server.js" || p.endsWith("/server.js"),
    (p) => p === "index.js" || p.endsWith("/index.js")
  ]);

  const hasTech = (name: string) =>
    techStack.some((t) => t.toLowerCase() === name.toLowerCase());

  let runtime: Runtime = "unknown";

  if (hasTech("Next.js") || hasNextConfig) {
    runtime = "next";
  } else if (hasTech("Vite") || hasViteConfig) {
    runtime = "vite";
  } else if (hasTech("React") && hasPackageJson) {
    runtime = "react";
  } else if (hasNodeServer || (hasPackageJson && hasAny([(p) => p.endsWith("server.js")]))) {
    runtime = "node";
  } else if (hasRequirements || hasPyproject || hasPythonMain) {
    runtime = "python";
  } else if (hasTech("Go") || hasGoMod) {
    runtime = "go";
  }

  const cloneUrl =
    repoUrl && repoUrl.startsWith("http")
      ? repoUrl
      : "https://github.com/owner/repo";

  const steps: Step[] = [
    {
      title: "Clone the repository",
      content: `git clone ${cloneUrl}`,
      isCode: true
    },
    {
      title: "Enter the project directory",
      content: "cd <repo-folder>",
      isCode: true
    }
  ];

  switch (runtime) {
    case "next":
      steps.push(
        {
          title: "Prerequisites",
          content: "Node.js (LTS) and npm, pnpm, or yarn."
        },
        {
          title: "Install dependencies",
          content: "npm install",
          isCode: true
        },
        {
          title: "Start the dev server",
          content: "npm run dev",
          isCode: true
        },
        {
          title: "Open in browser",
          content: "Visit the localhost URL printed in the terminal (e.g. http://localhost:3000)."
        }
      );
      break;
    case "vite":
      steps.push(
        {
          title: "Prerequisites",
          content: "Node.js and npm, pnpm, or yarn."
        },
        {
          title: "Install dependencies",
          content: "npm install",
          isCode: true
        },
        {
          title: "Start the dev server",
          content: "npm run dev",
          isCode: true
        },
        {
          title: "Open in browser",
          content: "Visit the localhost URL printed in the terminal."
        }
      );
      break;
    case "react":
      steps.push(
        {
          title: "Prerequisites",
          content: "Node.js and npm or yarn."
        },
        {
          title: "Install dependencies",
          content: "npm install",
          isCode: true
        },
        {
          title: "Start the app",
          content: hasPackageJson ? "npm start" : "npm run dev",
          isCode: true
        },
        {
          title: "Open in browser",
          content: "Use the URL shown in the terminal (e.g. http://localhost:3000)."
        }
      );
      break;
    case "node":
      steps.push(
        {
          title: "Prerequisites",
          content: "Node.js installed."
        },
        hasPackageJson
          ? {
              title: "Install dependencies",
              content: "npm install",
              isCode: true
            }
          : {
              title: "Dependencies",
              content: "Check README or package.json for install steps."
            },
        {
          title: "Run the server",
          content: hasAny([(p) => p.endsWith("server.js")]) ? "node server.js" : "node index.js",
          isCode: true
        },
        {
          title: "Use the app",
          content: "Call the exposed URL (e.g. http://localhost:3000 or the port shown)."
        }
      );
      break;
    case "python":
      steps.push(
        {
          title: "Prerequisites",
          content: "Python 3 and pip (or uv/poetry if the project uses them)."
        },
        {
          title: "Optional: create a virtual environment",
          content: ["python -m venv .venv", "source .venv/bin/activate  # Windows: .venv\\Scripts\\activate"],
          isCode: true
        },
        {
          title: "Install dependencies",
          content: hasRequirements
            ? "pip install -r requirements.txt"
            : hasPyproject
            ? "pip install -e ."
            : "pip install -r requirements.txt  # or see README",
          isCode: true
        },
        {
          title: "Run the application",
          content: hasPythonMain ? "python main.py" : "python app.py  # or see README",
          isCode: true
        }
      );
      break;
    case "go":
      steps.push(
        {
          title: "Prerequisites",
          content: "Go installed (see https://go.dev/dl)."
        },
        {
          title: "Install dependencies",
          content: "go mod download",
          isCode: true
        },
        {
          title: "Run the application",
          content: "go run .  # or go run ./cmd/... (check README)",
          isCode: true
        }
      );
      break;
    default:
      steps.push(
        {
          title: "Prerequisites",
          content: "Check the README for required runtimes (Node, Python, etc.)."
        },
        {
          title: "Install dependencies",
          content: "Follow README: often npm install, pip install -r requirements.txt, or similar."
        },
        {
          title: "Run the project",
          content: "Use the start command from README or package.json (e.g. npm run dev, npm start)."
        }
      );
      break;
  }

  const runtimeLabel =
    runtime === "next"
      ? "Next.js"
      : runtime === "vite"
      ? "Vite"
      : runtime === "react"
      ? "React"
      : runtime === "node"
      ? "Node.js"
      : runtime === "python"
      ? "Python"
      : runtime === "go"
      ? "Go"
      : "General";

  return (
    <section className="glass-panel border-slate-800/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Quick start guide
        </h2>
        <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">
          {runtimeLabel}
        </span>
      </div>
      <p className="mb-4 text-[11px] text-slate-400">
        Step-by-step guide to run this project locally based on the detected tech stack.
      </p>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-[11px] font-medium text-slate-200">
                {step.title}
              </h3>
              {Array.isArray(step.content) ? (
                <div className="space-y-1">
                  {step.content.map((line, j) => (
                    <p
                      key={j}
                      className={
                        step.isCode
                          ? "font-mono text-[11px] text-slate-100"
                          : "text-[11px] text-slate-300"
                      }
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p
                  className={
                    step.isCode
                      ? "rounded border border-slate-700 bg-slate-900/70 px-2 py-1 font-mono text-[11px] text-slate-100"
                      : "text-[11px] leading-relaxed text-slate-300"
                  }
                >
                  {step.content}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
