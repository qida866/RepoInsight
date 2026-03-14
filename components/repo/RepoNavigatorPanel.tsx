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

const NAV_SECTION_ORDER = [
  "start-here",
  "core-modules",
  "api",
  "auth",
  "database",
  "config"
] as const;

function heuristicSections(fileTree: string[], lower: string[]): NavSection[] {
  const getPaths = (pred: (lp: string) => boolean) =>
    fileTree.filter((_, i) => pred(lower[i]!));

  const startHere = getPaths(
    (lp) =>
      lp === "readme.md" ||
      lp.endsWith("/readme.md") ||
      lp.endsWith("/package.json") ||
      lp === "app/page.tsx" ||
      lp === "app/page.js" ||
      lp === "src/main.tsx" ||
      lp === "src/main.js" ||
      lp === "src/index.tsx" ||
      lp === "src/index.js" ||
      lp === "pages/index.tsx" ||
      lp === "pages/index.js"
  );
  const coreModules = getPaths(
    (lp) =>
      (lp.startsWith("src/") || lp.startsWith("app/") || lp.startsWith("pages/") || lp.startsWith("lib/") || lp.startsWith("backend/") || lp.startsWith("server/")) &&
      !lp.startsWith("app/api") &&
      !lp.startsWith("pages/api") &&
      !lp.includes("/api/")
  ).filter((p) => !startHere.includes(p));
  const apiLayer = getPaths(
    (lp) =>
      lp.startsWith("app/api") ||
      lp.startsWith("pages/api") ||
      lp.startsWith("api/") ||
      lp.includes("/api/") ||
      lp.includes("/routes/")
  );
  const auth = getPaths(
    (lp) =>
      lp.includes("auth") ||
      lp.includes("/middleware") ||
      lp.includes("jwt") ||
      lp.includes("session")
  );
  const database = getPaths(
    (lp) =>
      lp.includes("/models/") ||
      lp.includes("/db/") ||
      lp.includes("database") ||
      lp.includes("prisma/") ||
      lp.includes("/schema")
  );
  const config = getPaths(
    (lp) =>
      lp.includes("/config/") ||
      lp.endsWith(".env") ||
      lp.includes(".env.") ||
      lp.includes("settings")
  );

  const sections: NavSection[] = [
    { id: "start-here", label: "Start Here", description: "Entry points and docs.", paths: startHere },
    { id: "core-modules", label: "Core Modules", description: "App structure and features.", paths: coreModules },
    { id: "api", label: "API Layer", description: "Routes and HTTP handlers.", paths: apiLayer },
    { id: "auth", label: "Authentication", description: "Auth and sessions.", paths: auth },
    { id: "database", label: "Database", description: "Models and persistence.", paths: database },
    { id: "config", label: "Configuration", description: "Config and env.", paths: config }
  ];
  return sections.filter((s) => s.paths.length > 0);
}

function normalizeApiSections(sections: NavSection[]): NavSection[] {
  const idToLabel: Record<string, string> = {
    "start-here": "Start Here",
    "core-modules": "Core Modules",
    api: "API Layer",
    auth: "Authentication",
    database: "Database",
    config: "Configuration",
    overview: "Start Here",
    architecture: "Start Here",
    "key-modules": "Core Modules",
    data: "Database"
  };
  const toNormalizedId = (id: string): string => {
    if (NAV_SECTION_ORDER.includes(id as (typeof NAV_SECTION_ORDER)[number])) return id;
    switch (id) {
      case "overview":
      case "architecture":
        return "start-here";
      case "key-modules":
        return "core-modules";
      case "data":
        return "database";
      default:
        return id;
    }
  };
  const byId = new Map<string, NavSection>();
  for (const s of sections) {
    const id = toNormalizedId(s.id);
    const label = idToLabel[id] ?? s.label;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { id, label, description: s.description, paths: [...s.paths] });
    } else {
      existing.paths = [...new Set([...existing.paths, ...s.paths])];
    }
  }
  return NAV_SECTION_ORDER.map((id) => byId.get(id)).filter(Boolean) as NavSection[];
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
          setSections(normalizeApiSections(data.sections).filter((s) => s.paths.length > 0));
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

  const handleSectionToggle = (section: NavSection) => {
    setExpandedId((prev) => (prev === section.id ? null : section.id));
    if (section.paths.length > 0) onHighlightFiles?.(section.paths);
  };

  const handleFileClick = (path: string) => {
    onNavigateFile?.(path);
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
        AI-generated navigation. Click a file to open it in the code viewer.
      </p>
      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedId === section.id;
          return (
            <div key={section.id} className="rounded-lg border border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => handleSectionToggle(section)}
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
                            handleFileClick(p);
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
