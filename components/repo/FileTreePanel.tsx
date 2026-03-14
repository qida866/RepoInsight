import { useState } from "react";
import type { RepoAnalysis, FileNode } from "@/types/repo";

interface Props {
  analysis: RepoAnalysis;
  /** Paths to highlight (e.g. from Architecture graph node click). Sync with graph. */
  highlightedPaths?: string[] | null;
  /** When a file is clicked. */
  onSelectFile?: (path: string) => void;
}

function FileItem({
  node,
  depth = 0,
  highlightedPaths,
  onSelectFile,
  openFolders,
  toggleFolder,
}: {
  node: FileNode;
  depth?: number;
  highlightedPaths?: string[] | null;
  onSelectFile?: (path: string) => void;
  openFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isDir = node.type === "dir";
  const name = node.path.split("/").pop() ?? node.path;
  const isOpen = isDir && openFolders.has(node.path);
  const isHighlighted =
    !isDir &&
    !!highlightedPaths?.length &&
    highlightedPaths.some((hp) => hp === node.path);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isDir) toggleFolder(node.path);
          else onSelectFile?.(node.path);
        }}
        className={[
          "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs transition-colors",
          isHighlighted
            ? "bg-sky-500/15 text-sky-100 border-l-2 border-sky-500"
            : "text-slate-300 hover:bg-slate-800/60",
        ].join(" ")}
        style={{ paddingLeft: depth * 12 }}
      >
        <span className="w-4 text-slate-500">
          {isDir ? (isOpen ? "▾" : "▸") : "•"}
        </span>
        <span className="text-slate-500">{isDir ? "📁" : "📄"}</span>
        <span className="truncate">{name}</span>
      </button>
      {isDir && isOpen && node.children?.length ? (
        <div className="border-l border-slate-800/80 pl-2">
          {node.children.map((child) => (
            <FileItem
              key={child.path}
              node={child}
              depth={depth + 1}
              highlightedPaths={highlightedPaths}
              onSelectFile={onSelectFile}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function FileTreePanel({
  analysis,
  highlightedPaths,
  onSelectFile,
}: Props) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <section className="glass-panel max-h-[420px] overflow-auto border-slate-800/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">File Structure</h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {analysis.fileTree.length} roots
        </span>
      </div>
      <div className="space-y-1">
        {analysis.fileTree.map((node) => (
          <FileItem
            key={node.path}
            node={node}
            highlightedPaths={highlightedPaths}
            onSelectFile={onSelectFile}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    </section>
  );
}

