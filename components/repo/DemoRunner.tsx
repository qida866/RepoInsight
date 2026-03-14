"use client";

import { useMemo, useState } from "react";
import {
  getDemoMode,
  loadRepoFiles,
  pickPathsForDemo,
  getSandpackTemplate,
  isRunnableInBrowser,
  type SandpackTemplateId,
} from "@/lib/demoEngine";
import SandpackLivePanel from "./SandpackLivePanel";
import StaticIframePreview from "./StaticIframePreview";

interface DemoRunnerProps {
  owner: string;
  repo: string;
  fileTree: string[];
  techStack: string[];
}

function getRunInstructions(mode: string, frameworkLabel: string): { title: string; steps: string[] } {
  switch (mode) {
    case "node":
      return {
        title: "Run locally (Node/Express)",
        steps: [
          "Install dependencies: npm install",
          "Start the server: npm start or node server.js / node index.js",
          "Open the URL shown in the terminal (e.g. http://localhost:3000)",
        ],
      };
    case "python":
      return {
        title: "Run locally (Python)",
        steps: [
          "Create a virtual environment: python -m venv .venv",
          "Activate it and install: pip install -r requirements.txt",
          "Run the app: python app.py or python main.py",
          "Open the URL shown (e.g. http://127.0.0.1:5000)",
        ],
      };
    default:
      return {
        title: "Run instructions",
        steps: [
          "This stack cannot be previewed in the browser.",
          "Check the README and package.json (or requirements.txt) for how to run the project locally.",
        ],
      };
  }
}

export default function DemoRunner({
  owner,
  repo,
  fileTree,
  techStack,
}: DemoRunnerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    mode: "frontend" | "static";
    template?: SandpackTemplateId;
    files: Record<string, string>;
  } | null>(null);

  const { mode, framework, label } = useMemo(
    () => getDemoMode({ fileTree, techStack }),
    [fileTree, techStack]
  );

  const canRun = isRunnableInBrowser(mode);
  const runInstructions = !canRun ? getRunInstructions(mode, label) : null;

  const handleRunDemo = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const paths = pickPathsForDemo(mode, framework, fileTree);
      const { files, error: loadError } = await loadRepoFiles({ owner, repo, paths });
      if (loadError) {
        setError(loadError);
        return;
      }
      const template = getSandpackTemplate(mode, framework, fileTree);
      if (mode === "frontend" || mode === "static") {
        setPreviewData({
          mode,
          template,
          files,
        });
        setPreviewOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo");
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  return (
    <>
      <section className="glass-panel border-slate-800/80 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Demo runner
          </h2>
          {canRun && (
            <button
              type="button"
              onClick={handleRunDemo}
              disabled={loading}
              className="rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Run Demo"}
            </button>
          )}
        </div>

        {error && (
          <p className="mb-2 text-[11px] text-red-400">{error}</p>
        )}

        {canRun ? (
          <p className="text-[11px] text-slate-400">
            Detected {label}. Click Run Demo to load files and open a live preview
            {mode === "static" ? " (iframe)." : " (Sandpack)."}
          </p>
        ) : (
          <div className="rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
            <p className="mb-2 text-[11px] font-medium text-slate-300">
              {runInstructions?.title ?? "Cannot run in browser"}
            </p>
            <p className="mb-2 text-[11px] text-slate-400">
              Detected {label}. In-browser preview is not available for this stack.
            </p>
            <ul className="list-inside list-disc space-y-1 text-[11px] text-slate-400">
              {(runInstructions?.steps ?? []).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {previewOpen && previewData && (
        previewData.mode === "static" ? (
          <StaticIframePreview
            files={previewData.files}
            onClose={handleClosePreview}
          />
        ) : (
          previewData.template && (
            <SandpackLivePanel
              template={previewData.template}
              files={previewData.files}
              onClose={handleClosePreview}
            />
          )
        )
      )}
    </>
  );
}
