import React from "react";

interface CodeFlowPanelProps {
  fileTree: string[];
}

export default function CodeFlowPanel({
  fileTree
}: CodeFlowPanelProps): React.JSX.Element {
  const lower = fileTree.map((p) => p.toLowerCase());
  const hasAny = (predicates: ((p: string) => boolean)[]) =>
    lower.some((p) => predicates.some((fn) => fn(p)));

  // Frontend page candidates
  const frontendPages = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.endsWith("app/page.tsx") ||
      lp.startsWith("pages/") ||
      lp.includes("/pages/") ||
      lp.includes("/components/")
    );
  });

  // API route candidates
  const apiRoutes = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.startsWith("app/api") ||
      lp.startsWith("pages/api") ||
      lp.includes("/api/") ||
      lp.includes("/routes/")
    );
  });

  // Service layer candidates
  const serviceFiles = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return lp.includes("/services/") || lp.includes("/usecase") || lp.includes("/domain/");
  });

  // Data / persistence candidates
  const dataFiles = fileTree.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.includes("/models/") ||
      lp.includes("/db/") ||
      lp.includes("/database") ||
      lp.includes("prisma/") ||
      lp.endsWith(".sql")
    );
  });

  const hasFrontend = frontendPages.length > 0;
  const hasApi = apiRoutes.length > 0;
  const hasService = serviceFiles.length > 0;
  const hasData = dataFiles.length > 0;

  const flowSteps: { id: string; label: string; detail?: string }[] = [];

  if (hasFrontend) {
    flowSteps.push({
      id: "frontend",
      label: "Frontend page",
      detail: frontendPages[0]
    });
  }
  if (hasApi) {
    flowSteps.push({
      id: "api",
      label: "API route / controller",
      detail: apiRoutes[0]
    });
  }
  if (hasService) {
    flowSteps.push({
      id: "service",
      label: "Service / domain logic",
      detail: serviceFiles[0]
    });
  }
  if (hasData) {
    flowSteps.push({
      id: "data",
      label: "Data / persistence layer",
      detail: dataFiles[0]
    });
  }

  const hasFlow = flowSteps.length > 1;

  return (
    <section className="glass-panel transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Code flow
        </h2>
      </div>
      {!hasFlow ? (
        <p className="text-xs leading-relaxed text-slate-500">
          A clear frontend → API → service → data request flow is not obvious from the
          current tree. This repository may be a library or use different conventions.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-xs text-slate-200">
          <p className="text-[11px] text-slate-300">
            In a typical request, control likely flows through these layers:
          </p>
          <div className="flex flex-wrap items-stretch gap-2">
            {flowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex min-w-[140px] max-w-[220px] flex-1 flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                  <span className="text-[11px] font-semibold text-slate-100">
                    {step.label}
                  </span>
                  {step.detail && (
                    <span className="truncate font-mono text-[10px] text-slate-300">
                      {step.detail}
                    </span>
                  )}
                </div>
                {index < flowSteps.length - 1 && (
                  <div className="flex items-center">
                    <span className="text-slate-500">→</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Follow imports and function calls between these files to trace real
            end-to-end behavior for a given feature or request.
          </p>
        </div>
      )}
    </section>
  );
}

