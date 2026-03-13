import type { RepoAnalysis, FileNode } from "@/types/repo";

interface Props {
  analysis: RepoAnalysis;
}

function FileItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const isDir = node.type === "dir";
  return (
    <div>
      <div
        className="flex items-center gap-1 text-xs text-slate-300"
        style={{ paddingLeft: depth * 12 }}
      >
        <span className="text-slate-500">
          {isDir ? "📁" : "📄"}
        </span>
        <span>{node.path.split("/").pop()}</span>
      </div>
      {isDir &&
        node.children?.map((child) => (
          <FileItem key={child.path} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export default function FileTreePanel({ analysis }: Props) {
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
          <FileItem key={node.path} node={node} />
        ))}
      </div>
    </section>
  );
}

