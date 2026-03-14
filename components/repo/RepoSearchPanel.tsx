"use client";

import RepoSearch from "./RepoSearch";

interface RepoSearchPanelProps {
  files: string[];
  onSelectFile?: (path: string) => void;
}

export default function RepoSearchPanel({
  files,
  onSelectFile
}: RepoSearchPanelProps) {
  return (
    <section className="glass-panel space-y-3 border-slate-800/80 p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo search
        </h2>
      </div>
      <RepoSearch
        files={files}
        onSelectFile={onSelectFile}
        placeholder="Search files by name (e.g. auth, service, README)"
        maxResults={25}
        aria-label="Search repository files by name"
      />
    </section>
  );
}
