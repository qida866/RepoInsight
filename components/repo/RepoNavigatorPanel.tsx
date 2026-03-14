"use client";

import { useCallback, useEffect, useState } from "react";

interface NavSection {
  id: string;
  label: string;
  description: string;
  paths: string[];
}

interface RepoNavigatorPanelProps {
  fileTree: string[];
  name?: string;
  techStack?: string[];
  onNavigateFile?: (path: string) => void;
  /** When a section is clicked, call with that section's file paths so the app can highlight them (e.g. in FileExplorer). */
  onHighlightFiles?: (paths: string[]) => void;
}

function heuristicSections(fileTree: string[], lower: string[]): NavSection[] {
  const sections: NavSection[] = [
    {
      id: "overview",
      label: "Overview",
      description: "High-level entry files and docs.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp === "readme.md" || lp.endsWith("/readme.md") || lp.endsWith("/package.json");
      })
    },
    {
      id: "architecture",
      label: "Architecture",
      description: "Top-level structure and main code areas.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp.startsWith("src/") || lp.startsWith("app/") || lp.startsWith("pages/") || lp.startsWith("backend/") || lp.startsWith("server/");
      })
    },
    {
      id: "key-modules",
      label: "Key Modules",
      description: "Important feature and domain folders.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp.includes("/components/") || lp.startsWith("components/") || lp.includes("/services/") || lp.startsWith("services/") || lp.includes("/features/");
      })
    },
    {
      id: "api",
      label: "API Layer",
      description: "Routes, controllers, and HTTP handlers.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp.startsWith("app/api") || lp.startsWith("pages/api") || lp.startsWith("api/") || lp.includes("/api/") || lp.includes("/routes/");
      })
    },
    {
      id: "data",
      label: "Data Layer",
      description: "Models, database, and persistence code.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp.includes("/models/") || lp.includes("/db/") || lp.includes("database") || lp.includes("prisma/");
      })
    },
    {
      id: "auth",
      label: "Authentication",
      description: "Auth flows, sessions, and guards.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp.includes("auth") || lp.includes("/middleware") || lp.includes("jwt") || lp.includes("session");
      })
    },
    {
      id: "config",
      label: "Configuration",
      description: "Settings, config files, and environments.",
      paths: fileTree.filter((p, i) => {
        const lp = lower[i]!;
        return lp.includes("/config/") || lp.endsWith(".env") || lp.includes(".env.") || lp.includes("settings");
      })
    }
  ];
  return sections.filter((s) => s.paths.length > 0);
}

export default function RepoNavigatorPanel({
  fileTree,
  name,
  techStack = [],
  onNavigateFile,
  onHighlightFiles
}: RepoNavigatorPanelProps) {
  const [sections, setSections] = useState<NavSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSections = useCallback(() => {
    if (!fileTree.length) {
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/repo-navigation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileTree,
        name,
        techStack
      })
    })
      .then((res) => res.json())
      .then((data: { sections?: NavSection[] | null }) => {
        if (data.sections && data.sections.length > 0) {
          setSections(data.sections);
        } else {
          const lower = fileTree.map((p) => p.toLowerCase());
          setSections(heuristicSections(fileTree, lower));
        }
      })
      .catch(() => {
        const lower = fileTree.map((p) => p.toLowerCase());
        setSections(heuristicSections(fileTree, lower));
      })
      .finally(() => setLoading(false));
  }, [fileTree, name, techStack]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const handleSectionClick = (section: NavSection) => {
    const paths = section.paths;
    if (paths.length === 0) return;
    onHighlightFiles?.(paths);
    onNavigateFile?.(paths[0]!);
    setExpandedId((prev) => (prev === section.id ? null : section.id));
  };

  if (loading) {
    return (
      <section className="glass-panel space-y-3 border-slate-800/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo navigator
        </h2>
        <p className="text-xs text-slate-500">Generating navigation guide…</p>
      </section>
    );
  }

  if (sections.length === 0) {
    return (
      <section className="glass-panel space-y-3 border-slate-800/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo navigator
        </h2>
        <p className="text-xs text-slate-500">
          No sections detected. Try a more structured repository.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel space-y-3 border-slate-800/80 p-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Repo navigator
      </h2>
      <p className="text-[11px] text-slate-500">
        Click a section to highlight related files and open the first one.
      </p>
      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedId === section.id;
          return (
            <div key={section.id} className="rounded-lg border border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => handleSectionClick(section)}
                className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-slate-800/50"
              >
                <div>
                  <div className="text-[11px] font-medium text-slate-100">
                    {section.label}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {section.description}
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                  {section.paths.length}
                </span>
              </button>
              {isExpanded && (
                <div className="max-h-40 overflow-auto border-t border-slate-800 px-3 py-2">
                  <ul className="space-y-1">
                    {section.paths.map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateFile?.(p);
                          }}
                          className="block w-full truncate rounded px-2 py-1 text-left font-mono text-[10px] text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
