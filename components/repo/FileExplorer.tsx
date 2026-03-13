"use client";

import { useState } from "react";
import type { FileNode } from "@/types/repo";

interface FileExplorerProps {
  tree: FileNode[];
  selectedPath?: string | null;
  onSelectFile?: (path: string) => void;
}

export default function FileExplorer({
  tree,
  selectedPath,
  onSelectFile
}: FileExplorerProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode) => {
    const segments = node.path.split("/");
    const name = segments[segments.length - 1] || node.path || "/";
    const isDir = node.type === "dir";
    const nodeId = node.path || name;
    const isOpen = isDir && openFolders.has(nodeId);
    const isActive = !isDir && selectedPath && selectedPath === node.path;

    return (
      <div key={nodeId}>
        <button
          type="button"
          onClick={() => {
            if (isDir) {
              toggleFolder(nodeId);
            } else {
              onSelectFile?.(node.path);
            }
          }}
          className={[
            "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs transition-colors",
            isActive
              ? "bg-slate-800 text-slate-50"
              : "text-slate-200 hover:bg-slate-800/60"
          ].join(" ")}
        >
          <span className="w-4 text-slate-500">
            {isDir ? (isOpen ? "▾" : "▸") : "•"}
          </span>
          <span className="w-4 text-slate-500">
            {isDir ? "📁" : "📄"}
          </span>
          <span className="truncate">{name}</span>
        </button>
        {isDir && isOpen && node.children && (
          <div className="ml-4 border-l border-slate-800/80 pl-2">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-800 text-xs">
      <div className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Files
      </div>
      <div className="flex-1 overflow-auto pr-1">
        {tree.map((node) => renderNode(node))}
      </div>
    </div>
  );
}

