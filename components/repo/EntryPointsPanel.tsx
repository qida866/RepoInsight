import type React from "react";

interface EntryPointsPanelProps {
  fileTree: string[];
}

export default function EntryPointsPanel({
  fileTree
}: EntryPointsPanelProps): React.JSX.Element {
  const lowerPaths = fileTree.map((p) => p.toLowerCase());

  const hasExact = (candidate: string) =>
    lowerPaths.includes(candidate.toLowerCase());

  const findPath = (candidate: string) =>
    fileTree.find((p) => p.toLowerCase() === candidate.toLowerCase());

  const entries: { id: string; label: string; file?: string }[] = [
    {
      id: "next-app",
      label: "Next.js – app/page.tsx",
      file: hasExact("app/page.tsx") ? findPath("app/page.tsx") : undefined
    },
    {
      id: "react-app",
      label: "React – src/App.tsx",
      file: hasExact("src/app.tsx") ? findPath("src/App.tsx") : undefined
    },
    {
      id: "node-server",
      label: "Node – server.js",
      file: hasExact("server.js") ? findPath("server.js") : undefined
    },
    {
      id: "node-index",
      label: "Node – index.js",
      file: hasExact("index.js") ? findPath("index.js") : undefined
    },
    {
      id: "python-main",
      label: "Python – main.py",
      file: hasExact("main.py") ? findPath("main.py") : undefined
    },
    {
      id: "python-app",
      label: "Python – app.py",
      file: hasExact("app.py") ? findPath("app.py") : undefined
    }
  ];

  const detected = entries.filter((e) => e.file);

  return (
    <section className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Project entry points
        </h2>
      </div>
      {detected.length === 0 ? (
        <p className="text-xs leading-relaxed text-slate-500">
          No standard Next.js, React, Node, or Python entrypoint files were detected.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs text-slate-200">
          {detected.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2"
            >
              <span className="text-[10px] font-medium text-slate-300">
                {entry.label}
              </span>
              {entry.file && (
                <span className="rounded-full bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] text-slate-100">
                  {entry.file}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

