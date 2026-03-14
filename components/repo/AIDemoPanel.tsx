"use client";

import { useMemo, useState, useEffect } from "react";
import { getDemoMode, isRunnableInBrowser } from "@/lib/demoEngine";
import { detectEntrypoints } from "@/lib/repoAnalyzer";
import DemoRunner from "./DemoRunner";
import DemoMockRenderer, { normalizeArchetype } from "./DemoMockRenderer";
import type { AIDemoFrontendResponse, AIDemoBackendResponse } from "@/app/api/ai-demo-preview/route";

interface AIDemoPanelProps {
  owner: string;
  repo: string;
  repoName?: string;
  description?: string | null;
  fileTree: string[];
  techStack: string[];
}

function MockUICard({ data, productName }: { data: AIDemoFrontendResponse; productName?: string }) {
  const { appType, screens, mockUiDescription } = data;
  const archetype = normalizeArchetype(appType);
  const screenLabels = screens?.length >= 2 ? screens.slice(0, 4) : undefined;
  return (
    <div className="space-y-3">
      <DemoMockRenderer
        archetype={archetype}
        screens={screenLabels}
        productName={productName ?? appType}
      />
      <p className="text-[10px] text-slate-500 leading-relaxed">
        {mockUiDescription}
      </p>
    </div>
  );
}

function BackendDemoCard({ data }: { data: AIDemoBackendResponse }) {
  const { apiRoutes, services, database, systemDescription } = data;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-xl">
      <div className="border-b border-slate-700/80 bg-slate-800/80 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/80" />
          <span className="h-2 w-2 rounded-full bg-amber-500/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
        </div>
        <span className="ml-2 text-[10px] text-slate-500 font-medium">Backend — AI preview</span>
      </div>
      <div className="p-3 space-y-4">
        <p className="text-[11px] text-slate-400 leading-relaxed">{systemDescription}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">API routes</h4>
            <ul className="space-y-1">
              {apiRoutes.slice(0, 5).map((r, i) => (
                <li key={i} className="text-[11px] font-mono text-slate-300 truncate">{r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Services</h4>
            <ul className="space-y-1">
              {services.slice(0, 5).map((s, i) => (
                <li key={i} className="text-[11px] text-slate-300">{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Database</h4>
            <ul className="space-y-1">
              {database.slice(0, 5).map((d, i) => (
                <li key={i} className="text-[11px] text-slate-300">{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIDemoPanel({
  owner,
  repo,
  repoName: repoNameProp,
  description,
  fileTree,
  techStack,
}: AIDemoPanelProps) {
  const [aiPreview, setAiPreview] = useState<AIDemoFrontendResponse | AIDemoBackendResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { mode, label } = useMemo(() => getDemoMode({ fileTree, techStack }), [fileTree, techStack]);
  const canRun = isRunnableInBrowser(mode);
  const isBackend = mode === "node" || mode === "python" || mode === "unsupported";

  const repoName = repoNameProp ?? repo;
  const entryPoints = useMemo(() => detectEntrypoints(fileTree), [fileTree]);

  useEffect(() => {
    if (canRun) {
      setAiPreview(null);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    fetch("/api/ai-demo-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoName,
        description: description ?? null,
        techStack: techStack ?? [],
        fileTree,
        entryPoints,
        isBackend,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.kind === "frontend" || data.kind === "backend") setAiPreview(data);
        else setAiError("Invalid preview response");
      })
      .catch((e) => setAiError(e instanceof Error ? e.message : "Failed to load AI preview"))
      .finally(() => setAiLoading(false));
  }, [canRun, repoName, description, techStack, fileTree, entryPoints, isBackend]);

  if (canRun) {
    return (
      <DemoRunner
        owner={owner}
        repo={repo}
        fileTree={fileTree}
        techStack={techStack}
      />
    );
  }

  return (
    <section className="glass-panel border-slate-800/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          AI Demo Preview
        </h2>
        <span className="text-[10px] text-amber-500/90">Inferred from repo structure</span>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        This repo cannot be run in the browser ({label}). Here’s an AI-generated preview of what it likely is.
      </p>

      {aiLoading && (
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-6 text-center text-slate-500 text-sm">
          Generating demo preview…
        </div>
      )}

      {aiError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-[11px] text-red-400">
          {aiError}
        </div>
      )}

      {!aiLoading && !aiError && aiPreview && (
        <div className="space-y-4">
          {aiPreview.kind === "frontend" && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Likely app type</h3>
                  <p className="text-[11px] text-slate-200">{aiPreview.appType}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Likely screens / pages</h3>
                  <ul className="text-[11px] text-slate-300 flex flex-wrap gap-x-2 gap-y-0.5">
                    {aiPreview.screens.map((s, i) => (
                      <li key={i}>{s}{i < aiPreview.screens.length - 1 ? "," : ""}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Likely user flow</h3>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5">
                  {aiPreview.userFlow.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
              <MockUICard data={aiPreview} productName={repoName} />
            </>
          )}
          {aiPreview.kind === "backend" && (
            <>
              <p className="text-[11px] text-slate-400">Backend-only repository. Inferred structure:</p>
              <BackendDemoCard data={aiPreview} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
