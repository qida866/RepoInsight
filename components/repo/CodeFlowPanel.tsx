"use client";

import { useMemo } from "react";
import { detectEntrypoints } from "@/lib/repoAnalyzer";

export interface FlowStep {
  id: string;
  label: string;
  hint?: string;
  /** File paths in this step (empty for conceptual steps like "User action") */
  paths: string[];
}

interface CodeFlowPanelProps {
  fileTree: string[];
  /** Currently selected file path (from FileExplorer) */
  selectedPath?: string | null;
  /** Callback when user clicks a related file in the flow */
  onSelectFile?: (path: string) => void;
}

const FLOW_KEYWORDS = [
  "auth",
  "login",
  "logout",
  "dashboard",
  "admin",
  "settings",
  "api",
  "route",
  "service",
  "db",
  "database",
  "model",
  "page",
];

function pathMatches(a: string, b: string | null | undefined): boolean {
  if (!b) return false;
  const na = a.toLowerCase().replace(/^\/+/, "");
  const nb = b.toLowerCase().replace(/^\/+/, "");
  return na === nb || na.endsWith("/" + nb) || nb.endsWith("/" + na);
}

function inferFlows(fileTree: string[]): {
  userFlow: FlowStep[];
  requestFlow: FlowStep[];
  dataFlow: FlowStep[];
} {
  const lower = fileTree.map((p) => p.toLowerCase());

  const entryPoints = detectEntrypoints(fileTree);

  // Frontend
  const frontendPaths = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.startsWith("app/") ||
      lp.startsWith("pages/") ||
      lp.includes("/pages/") ||
      lp.includes("/components/") ||
      lp.includes("/ui/") ||
      lp.endsWith("page.tsx") ||
      lp.endsWith("page.jsx")
    );
  });

  const pageLikeSegments = new Set<string>();
  frontendPaths.forEach((p) => {
    const parts = p.split(/[/\\]/);
    parts.forEach((seg) => {
      const s = seg.toLowerCase().replace(/\.[^.]+$/, "");
      if (FLOW_KEYWORDS.includes(s) || s === "page" || s === "pages") return;
      if (s.length > 2 && /^[a-z-]+$/.test(s)) pageLikeSegments.add(s);
    });
  });
  FLOW_KEYWORDS.forEach((k) => {
    if (lower.some((p) => p.includes(k))) pageLikeSegments.add(k);
  });

  const apiPaths = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.startsWith("app/api") ||
      lp.startsWith("pages/api") ||
      lp.includes("/api/") ||
      lp.includes("/routes/") ||
      lp.includes("/controllers/") ||
      lp.includes("router.")
    );
  });

  const servicePaths = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.includes("/services/") ||
      lp.includes("/service/") ||
      lp.includes("usecase") ||
      lp.includes("/domain/") ||
      lp.includes("/handlers/") ||
      lp.includes("/application/") ||
      lp.includes("backend/")
    );
  });

  const dbPaths = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.includes("/db/") ||
      lp.includes("/database") ||
      lp.includes("prisma/") ||
      lp.includes("migrations/") ||
      lp.includes("/models/") ||
      lp.includes("/entities/") ||
      lp.includes("/repositories/") ||
      lp.endsWith(".sql")
    );
  });

  const pickHint = (paths: string[]): string | undefined => {
    const p = paths[0];
    if (!p) return undefined;
    return p.length > 36 ? p.slice(0, 33) + "..." : p;
  };

  const userSteps: FlowStep[] = [];
  userSteps.push({
    id: "user",
    label: "User action",
    hint: pageLikeSegments.size
      ? `e.g. login, dashboard, ${[...pageLikeSegments].slice(0, 3).join(", ")}`
      : "e.g. visit page, submit form",
    paths: [],
  });
  if (frontendPaths.length > 0) {
    userSteps.push({
      id: "frontend",
      label: "Frontend page",
      hint: pickHint(frontendPaths),
      paths: frontendPaths,
    });
  }
  if (apiPaths.length > 0) {
    userSteps.push({
      id: "api",
      label: "API route",
      hint: pickHint(apiPaths),
      paths: apiPaths,
    });
  }
  if (servicePaths.length > 0) {
    userSteps.push({
      id: "service",
      label: "Service layer",
      hint: pickHint(servicePaths),
      paths: servicePaths,
    });
  }
  if (dbPaths.length > 0) {
    userSteps.push({
      id: "db",
      label: "Database",
      hint: pickHint(dbPaths),
      paths: dbPaths,
    });
  }

  const requestSteps: FlowStep[] = [];
  if (entryPoints.length > 0) {
    requestSteps.push({
      id: "entry",
      label: "Entry point",
      hint: pickHint(entryPoints),
      paths: entryPoints,
    });
  }
  if (frontendPaths.length > 0) {
    requestSteps.push({
      id: "frontend",
      label: "Frontend / page",
      hint: pickHint(frontendPaths),
      paths: frontendPaths,
    });
  }
  if (apiPaths.length > 0) {
    requestSteps.push({
      id: "api",
      label: "API route",
      hint: pickHint(apiPaths),
      paths: apiPaths,
    });
  }
  if (servicePaths.length > 0) {
    requestSteps.push({
      id: "service",
      label: "Service layer",
      hint: pickHint(servicePaths),
      paths: servicePaths,
    });
  }
  if (dbPaths.length > 0) {
    requestSteps.push({
      id: "db",
      label: "Database",
      hint: pickHint(dbPaths),
      paths: dbPaths,
    });
  }

  if (requestSteps.length === 0 && (frontendPaths.length > 0 || apiPaths.length > 0)) {
    if (frontendPaths.length > 0)
      requestSteps.push({
        id: "frontend",
        label: "Frontend page",
        hint: pickHint(frontendPaths),
        paths: frontendPaths,
      });
    if (apiPaths.length > 0)
      requestSteps.push({
        id: "api",
        label: "API route",
        hint: pickHint(apiPaths),
        paths: apiPaths,
      });
    if (servicePaths.length > 0)
      requestSteps.push({
        id: "service",
        label: "Service layer",
        hint: pickHint(servicePaths),
        paths: servicePaths,
      });
    if (dbPaths.length > 0)
      requestSteps.push({
        id: "db",
        label: "Database",
        hint: pickHint(dbPaths),
        paths: dbPaths,
      });
  }

  const dataSteps: FlowStep[] = [];
  if (dbPaths.length > 0) {
    dataSteps.push({
      id: "db",
      label: "Database",
      hint: pickHint(dbPaths),
      paths: dbPaths,
    });
  }
  if (servicePaths.length > 0) {
    dataSteps.push({
      id: "service",
      label: "Service / repository",
      hint: pickHint(servicePaths),
      paths: servicePaths,
    });
  }
  if (apiPaths.length > 0) {
    dataSteps.push({
      id: "api",
      label: "API response",
      hint: pickHint(apiPaths),
      paths: apiPaths,
    });
  }
  if (frontendPaths.length > 0) {
    dataSteps.push({
      id: "frontend",
      label: "Frontend state / UI",
      hint: pickHint(frontendPaths),
      paths: frontendPaths,
    });
  }

  return {
    userFlow: userSteps.length >= 2 ? userSteps : [],
    requestFlow: requestSteps.length >= 2 ? requestSteps : [],
    dataFlow: dataSteps.length >= 2 ? dataSteps : [],
  };
}

export type FlowStepRole = "prev" | "current" | "next" | null;

function FlowDiagram({
  title,
  steps,
  stepRoles,
  selectedPath,
  onSelectFile,
}: {
  title: string;
  steps: FlowStep[];
  stepRoles: FlowStepRole[];
  selectedPath?: string | null;
  onSelectFile?: (path: string) => void;
}) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 overflow-hidden">
      <div className="border-b border-slate-700/60 bg-slate-800/50 px-3 py-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
      </div>
      <div className="p-3 flex flex-col items-stretch">
        {steps.map((step, i) => {
          const role = stepRoles[i] ?? null;
          const isCurrent = role === "current";
          const isPrev = role === "prev";
          const isNext = role === "next";
          const isRelated = isCurrent || isPrev || isNext;
          const showRelatedFiles = isCurrent && step.paths.length > 0 && selectedPath;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`w-full rounded-lg border px-3 py-2.5 min-h-[44px] flex flex-col justify-center transition-colors ${
                  isCurrent
                    ? "border-emerald-500/60 bg-emerald-950/50 ring-1 ring-emerald-500/30"
                    : isPrev
                      ? "border-amber-700/40 bg-amber-950/20 border-dashed"
                      : isNext
                        ? "border-sky-700/40 bg-sky-950/20 border-dashed"
                        : "border-slate-700/80 bg-slate-800/60"
                }`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    isCurrent
                      ? "text-emerald-200"
                      : isPrev
                        ? "text-amber-200/90"
                        : isNext
                          ? "text-sky-200/90"
                          : "text-slate-200"
                  }`}
                >
                  {step.label}
                  {isPrev && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-400/80">
                      (previous)
                    </span>
                  )}
                  {isNext && (
                    <span className="ml-1.5 text-[10px] font-normal text-sky-400/80">
                      (next)
                    </span>
                  )}
                </span>
                {step.hint && !showRelatedFiles && (
                  <span className="mt-0.5 font-mono text-[10px] text-slate-500 truncate block">
                    {step.hint}
                  </span>
                )}
                {showRelatedFiles && onSelectFile && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500">
                      Related files
                    </span>
                    <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                      {step.paths.slice(0, 12).map((path) => (
                        <li key={path}>
                          <button
                            type="button"
                            onClick={() => onSelectFile(path)}
                            className={`block w-full text-left font-mono text-[10px] truncate rounded px-1.5 py-0.5 hover:bg-slate-700/50 ${
                              pathMatches(path, selectedPath)
                                ? "text-emerald-300 bg-emerald-900/30"
                                : "text-slate-400 hover:text-slate-300"
                            }`}
                            title={path}
                          >
                            {path}
                          </button>
                        </li>
                      ))}
                      {step.paths.length > 12 && (
                        <li className="text-[9px] text-slate-500">
                          +{step.paths.length - 12} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <span
                    className={`text-lg leading-none ${
                      isRelated ? "text-slate-400" : "text-slate-500"
                    }`}
                    aria-hidden
                  >
                    ↓
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getStepRoles(
  steps: FlowStep[],
  selectedPath: string | null | undefined
): FlowStepRole[] {
  if (!selectedPath) return steps.map(() => null);
  let currentIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].paths.some((p) => pathMatches(p, selectedPath))) {
      currentIndex = i;
      break;
    }
  }
  if (currentIndex < 0) return steps.map(() => null);
  return steps.map((_, i) => {
    if (i === currentIndex) return "current";
    if (i === currentIndex - 1) return "prev";
    if (i === currentIndex + 1) return "next";
    return null;
  });
}

export default function CodeFlowPanel({
  fileTree,
  selectedPath,
  onSelectFile,
}: CodeFlowPanelProps) {
  const { userFlow, requestFlow, dataFlow } = useMemo(
    () => inferFlows(fileTree),
    [fileTree]
  );

  const userRoles = useMemo(
    () => getStepRoles(userFlow, selectedPath),
    [userFlow, selectedPath]
  );
  const requestRoles = useMemo(
    () => getStepRoles(requestFlow, selectedPath),
    [requestFlow, selectedPath]
  );
  const dataRoles = useMemo(
    () => getStepRoles(dataFlow, selectedPath),
    [dataFlow, selectedPath]
  );

  const flowsContainingFile = useMemo(() => {
    if (!selectedPath) return [];
    const out: { name: string; stepIndex: number; prev: FlowStep | null; next: FlowStep | null }[] = [];
    const check = (name: string, steps: FlowStep[]) => {
      const idx = steps.findIndex((s) => s.paths.some((p) => pathMatches(p, selectedPath)));
      if (idx < 0) return;
      out.push({
        name,
        stepIndex: idx,
        prev: idx > 0 ? steps[idx - 1] : null,
        next: idx < steps.length - 1 ? steps[idx + 1] : null,
      });
    };
    check("User flow", userFlow);
    check("Request flow", requestFlow);
    check("Data flow", dataFlow);
    return out;
  }, [selectedPath, userFlow, requestFlow, dataFlow]);

  const hasAny =
    userFlow.length >= 2 || requestFlow.length >= 2 || dataFlow.length >= 2;

  return (
    <section className="glass-panel transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Code flow
        </h2>
      </div>

      {!hasAny ? (
        <p className="text-[11px] leading-relaxed text-slate-500">
          A clear flow (entry → frontend → API → service → database) is not
          obvious from the file tree. This repo may be a library or use
          different conventions.
        </p>
      ) : (
        <div className="space-y-4">
          {selectedPath && flowsContainingFile.length > 0 && (
            <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2.5 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Selected file
                </span>
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[280px]" title={selectedPath}>
                  {selectedPath}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span className="text-slate-500">Part of:</span>
                {flowsContainingFile.map((f) => (
                  <span key={f.name} className="text-slate-300">
                    {f.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                {flowsContainingFile.map((f) => (
                  <div key={f.name} className="flex gap-2">
                    {f.prev && (
                      <span className="text-slate-500">
                        Previous:{" "}
                        <span className="text-amber-300/90">{f.prev.label}</span>
                      </span>
                    )}
                    {f.next && (
                      <span className="text-slate-500">
                        Next:{" "}
                        <span className="text-sky-300/90">{f.next.label}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Inferred from entry points, api routes, service folders, database
            folders, and file names (auth, login, dashboard, api, db, service,
            route). Select a file in the explorer to see its place in the flow.
          </p>

          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            {userFlow.length >= 2 && (
              <FlowDiagram
                title="User flow"
                steps={userFlow}
                stepRoles={userRoles}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            )}
            {requestFlow.length >= 2 && (
              <FlowDiagram
                title="Request flow"
                steps={requestFlow}
                stepRoles={requestRoles}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            )}
            {dataFlow.length >= 2 && (
              <FlowDiagram
                title="Data flow"
                steps={dataFlow}
                stepRoles={dataRoles}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Follow imports and function calls between these files to trace
            end-to-end behavior for a given feature.
          </p>
        </div>
      )}
    </section>
  );
}
