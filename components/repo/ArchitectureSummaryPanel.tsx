import type React from "react";

interface ArchitectureSummaryPanelProps {
  fileTree: string[];
}

interface Bucket {
  id: string;
  label: string;
  folders: string[];
}

const NOISE_FOLDERS = new Set([
  "node_modules",
  ".git",
  ".github",
  ".vscode",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  "coverage"
]);

export default function ArchitectureSummaryPanel({
  fileTree
}: ArchitectureSummaryPanelProps): React.JSX.Element {
  const topLevelFolders = Array.from(
    new Set(
      fileTree
        .map((p) => p.split("/")[0] ?? "")
        .filter((name) => name && !NOISE_FOLDERS.has(name))
    )
  ).sort();

  const lowerTree = fileTree.map((p) => p.toLowerCase());
  const hasAny = (predicates: ((p: string) => boolean)[]) =>
    lowerTree.some((p) => predicates.some((fn) => fn(p)));

  const buckets: Bucket[] = [
    {
      id: "frontend",
      label: "Frontend",
      folders: topLevelFolders.filter((name) =>
        ["app", "pages", "src", "components", "ui", "client"].some((hint) =>
          name.toLowerCase().startsWith(hint)
        )
      )
    },
    {
      id: "backend",
      label: "Backend",
      folders: topLevelFolders.filter((name) =>
        ["server", "src-server", "backend", "services"].some((hint) =>
          name.toLowerCase().startsWith(hint)
        )
      )
    },
    {
      id: "api",
      label: "API",
      folders: topLevelFolders.filter((name) =>
        ["api", "routes", "controllers"].some((hint) =>
          name.toLowerCase().startsWith(hint)
        )
      )
    },
    {
      id: "data",
      label: "Data",
      folders: topLevelFolders.filter((name) =>
        ["prisma", "db", "migrations", "models", "entities"].some((hint) =>
          name.toLowerCase().startsWith(hint)
        )
      )
    },
    {
      id: "config",
      label: "Config",
      folders: topLevelFolders.filter((name) =>
        ["config", "configs"].some((hint) =>
          name.toLowerCase().startsWith(hint)
        )
      )
    },
    {
      id: "tests",
      label: "Tests",
      folders: topLevelFolders.filter((name) =>
        ["tests", "test", "__tests__"].some((hint) =>
          name.toLowerCase().startsWith(hint)
        )
      )
    }
  ];

  // If no explicit top-level folders match, fall back to path-based presence
  const hasTestsByPath = hasAny([
    (p) => p.includes("/tests/"),
    (p) => p.includes("/__tests__/"),
    (p) => p.endsWith(".spec.ts") || p.endsWith(".test.ts") || p.endsWith(".spec.js")
  ]);

  if (hasTestsByPath && !buckets.find((b) => b.id === "tests")?.folders.length) {
    const testsBucket = buckets.find((b) => b.id === "tests");
    if (testsBucket) testsBucket.folders = ["(scattered test files)"];
  }

  const anyAssignments = buckets.some((b) => b.folders.length > 0);

  return (
    <section className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Architecture summary
        </h2>
      </div>
      {!anyAssignments ? (
        <p className="text-xs leading-relaxed text-slate-500">
          This repository does not expose clear frontend/backend/API/data/test folders at
          the top level. Start from the README and primary entrypoints to understand its
          structure.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-200">
          {buckets.map((bucket) => (
            <div key={bucket.id}>
              <div className="mb-1 text-[11px] font-medium text-slate-300">
                {bucket.label}
              </div>
              {bucket.folders.length === 0 ? (
                <p className="text-[11px] text-slate-500">Not detected.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {bucket.folders.map((folder) => (
                    <span
                      key={folder}
                      className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-100"
                    >
                      {folder}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

