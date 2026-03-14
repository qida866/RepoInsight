"use client";

import { useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
  useSandpackShell,
} from "@codesandbox/sandpack-react";
import type { SandpackTemplateId } from "@/lib/demoEngine";

export type SandpackTemplate = SandpackTemplateId;

interface SandboxPreviewProps {
  template: SandpackTemplateId;
  /** File path -> content. Keys can be with or without leading slash; we normalize to /path. */
  files: Record<string, string>;
  /** Optional class for the root container */
  className?: string;
  /** Show fullscreen toggle button in toolbar */
  showFullscreenToggle?: boolean;
}

function toSandpackFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const key = path.startsWith("/") ? path : `/${path}`;
    out[key] = content;
  }
  return out;
}

function RestartButton() {
  const { restart } = useSandpackShell();
  return (
    <button
      type="button"
      onClick={() => restart()}
      className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
      title="Restart preview"
    >
      <RestartIcon />
      Restart
    </button>
  );
}

function RestartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2 2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function PreviewContent() {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <SandpackPreview
          showNavigator={false}
          showRefreshButton
          showRestartButton={false}
          showOpenInCodeSandbox={false}
          showOpenNewtab={false}
          showSandpackErrorOverlay
          className="min-h-0 flex-1 border-0"
        />
        <SandpackConsole
          showHeader
          showRestartButton={false}
          showResetConsoleButton
          maxMessageCount={100}
          resetOnPreviewRestart
          className="max-h-[180px] min-h-[120px] shrink-0 border-t border-slate-800"
        />
      </div>
    </>
  );
}

export default function SandboxPreview({
  template,
  files,
  className = "",
  showFullscreenToggle = true,
}: SandboxPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const normalizedFiles = toSandpackFiles(files);

  const toolbar = (
    <div className="flex shrink-0 items-center justify-end gap-2 border-b border-slate-800 bg-slate-900/80 px-2 py-1.5">
      <RestartButton />
      {showFullscreenToggle && (
        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen preview"}
        >
          {isFullscreen ? (
            <>
              <ExitFullscreenIcon />
              Exit fullscreen
            </>
          ) : (
            <>
              <FullscreenIcon />
              Fullscreen
            </>
          )}
        </button>
      )}
    </div>
  );

  const content = (
    <SandpackProvider
      template={template}
      files={normalizedFiles}
      theme="dark"
      options={{
        recompileMode: "immediate",
        recompileDelay: 300,
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        {toolbar}
        <PreviewContent />
      </div>
    </SandpackProvider>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
        <div className="flex min-h-0 flex-1 flex-col">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950 ${className}`}
    >
      {content}
    </div>
  );
}
