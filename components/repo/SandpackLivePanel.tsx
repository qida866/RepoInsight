"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import type { SandpackTemplateId } from "@/lib/demoEngine";

export type SandpackTemplate = SandpackTemplateId;

interface SandpackLivePanelProps {
  template: SandpackTemplateId;
  /** File path -> content. Keys can be with or without leading slash; we normalize to /path. */
  files: Record<string, string>;
  onClose: () => void;
}

function toSandpackFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const key = path.startsWith("/") ? path : `/${path}`;
    out[key] = content;
  }
  return out;
}

export default function SandpackLivePanel({
  template,
  files,
  onClose
}: SandpackLivePanelProps) {
  const normalizedFiles = toSandpackFiles(files);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2">
        <span className="text-sm font-medium text-slate-200">
          Live preview — {template}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Sandpack
          template={template}
          files={normalizedFiles}
          options={{
            showNavigator: true,
            showTabs: true,
            showLineNumbers: true,
            editorHeight: "100%",
            classes: {
              "sp-wrapper": "h-full bg-slate-950",
              "sp-layout": "h-full bg-slate-950 border-0",
              "sp-tabs": "bg-slate-900 border-slate-800",
              "sp-tab-button": "text-slate-300",
              "sp-preview-container": "bg-white"
            }
          }}
          theme="dark"
        />
      </div>
    </div>
  );
}
