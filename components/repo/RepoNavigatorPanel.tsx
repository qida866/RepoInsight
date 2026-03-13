"use client";

interface RepoNavigatorPanelProps {
  fileTree: string[];
  onNavigateFile?: (path: string) => void;
}

interface NavigatorSection {
  id: string;
  label: string;
  description: string;
  match: (paths: string[], lower: string[]) => string[];
}

const SECTIONS: NavigatorSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "High-level entry files and docs.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp === "readme.md" ||
          lp.endsWith("/readme.md") ||
          lp === "package.json" ||
          lp.endsWith("/package.json")
        );
      })
  },
  {
    id: "architecture",
    label: "Architecture",
    description: "Top-level structure and main code areas.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp.startsWith("src/") ||
          lp.startsWith("app/") ||
          lp.startsWith("pages/") ||
          lp.startsWith("backend/") ||
          lp.startsWith("server/")
        );
      })
  },
  {
    id: "key-modules",
    label: "Key modules",
    description: "Important feature and domain folders.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp.startsWith("components/") ||
          lp.includes("/components/") ||
          lp.startsWith("services/") ||
          lp.includes("/services/") ||
          lp.startsWith("features/") ||
          lp.includes("/features/")
        );
      })
  },
  {
    id: "api",
    label: "API layer",
    description: "Routes, controllers, and HTTP handlers.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp.startsWith("app/api") ||
          lp.startsWith("pages/api") ||
          lp.startsWith("api/") ||
          lp.includes("/api/") ||
          lp.startsWith("routes/") ||
          lp.includes("/routes/")
        );
      })
  },
  {
    id: "data",
    label: "Data layer",
    description: "Models, database, and persistence code.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp.startsWith("models/") ||
          lp.includes("/models/") ||
          lp.startsWith("db/") ||
          lp.includes("/db/") ||
          lp.includes("database") ||
          lp.includes("prisma/")
        );
      })
  },
  {
    id: "auth",
    label: "Authentication",
    description: "Auth flows, sessions, and guards.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp.includes("auth") ||
          lp.includes("/middleware") ||
          lp.includes("jwt") ||
          lp.includes("session")
        );
      })
  },
  {
    id: "config",
    label: "Configuration",
    description: "Settings, config files, and environments.",
    match: (paths, lower) =>
      paths.filter((p, i) => {
        const lp = lower[i]!;
        return (
          lp.startsWith("config/") ||
          lp.includes("/config/") ||
          lp.endsWith(".env") ||
          lp.includes(".env.") ||
          lp.includes("settings")
        );
      })
  }
];

export default function RepoNavigatorPanel({
  fileTree,
  onNavigateFile
}: RepoNavigatorPanelProps) {
  const lower = fileTree.map((p) => p.toLowerCase());

  const sectionsWithMatches = SECTIONS.map((section) => {
    const matches = section.match(fileTree, lower);
    return { ...section, matches };
  }).filter((s) => s.matches.length > 0);

  const handleClickSection = (paths: string[]) => {
    if (!paths.length || !onNavigateFile) return;
    onNavigateFile(paths[0]!);
  };

  return (
    <section className="glass-panel space-y-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo navigator
        </h2>
      </div>
      {sectionsWithMatches.length === 0 ? (
        <p className="text-xs leading-relaxed text-slate-500">
          No obvious architecture sections detected yet. Try analyzing a larger or more
          structured repository.
        </p>
      ) : (
        <div className="grid gap-3 text-xs text-slate-200 md:grid-cols-2">
          {sectionsWithMatches.map((section) => (
            <div
              key={section.id}
              className="space-y-1.5"
            >
              <button
                type="button"
                onClick={() => handleClickSection(section.matches)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-left transition hover:border-sky-500 hover:bg-slate-900"
              >
                <div>
                  <div className="text-[11px] font-medium text-slate-100">
                    {section.label}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {section.description}
                  </div>
                </div>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] text-slate-400">
                  {section.matches.length}
                </span>
              </button>
              <div className="flex flex-wrap gap-1">
                {section.matches.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onNavigateFile?.(p)}
                    className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-200 hover:border-sky-500"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

