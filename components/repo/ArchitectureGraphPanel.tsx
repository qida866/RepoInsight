"use client";

import type { RepoAnalysis, FileNode } from "@/types/repo";
import {
  Background,
  Controls,
  ReactFlow,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ArchitectureGraphLayerId = "frontend" | "api" | "backend" | "database";

interface Props {
  /** At least fileTree (FileNode[]) is required. Full RepoAnalysis is used in RepoAnalysisShell. */
  analysis: RepoAnalysis | { fileTree: FileNode[] };
  /** When a layer node is clicked, call with that layer's file paths (sync with FileExplorer). */
  onHighlightPaths?: (paths: string[]) => void;
  /** Optional: when a layer is clicked, open the first file in the code viewer. */
  onSelectFile?: (path: string) => void;
  /** Externally controlled: which node is highlighted (e.g. from FileExplorer selection). */
  highlightedNodeId?: ArchitectureGraphLayerId | null;
}

const LAYER_ORDER: ArchitectureGraphLayerId[] = [
  "frontend",
  "api",
  "backend",
  "database",
];

function collectFilePaths(tree: FileNode[]): string[] {
  const paths: string[] = [];
  const walk = (node: FileNode) => {
    if (node.type === "file") paths.push(node.path);
    node.children?.forEach(walk);
  };
  tree.forEach(walk);
  return paths;
}

function buildLayerToPaths(filePaths: string[]): Record<ArchitectureGraphLayerId, string[]> {
  const lower = filePaths.map((p) => p.toLowerCase());
  const layerPaths: Record<ArchitectureGraphLayerId, string[]> = {
    frontend: [],
    api: [],
    backend: [],
    database: [],
  };
  filePaths.forEach((path, i) => {
    const p = lower[i]!;
    if (
      p.startsWith("app/") ||
      p.startsWith("pages/") ||
      p.includes("components/") ||
      p.endsWith(".tsx") ||
      p.endsWith(".jsx")
    ) {
      if (!p.startsWith("app/api") && !p.startsWith("pages/api") && !p.includes("/api/"))
        layerPaths.frontend.push(path);
    }
    if (
      p.includes("/api/") ||
      p.startsWith("app/api") ||
      p.startsWith("pages/api")
    ) {
      layerPaths.api.push(path);
    }
    if (
      p.includes("server/") ||
      p.includes("backend/") ||
      p.includes("controllers/") ||
      p.endsWith(".go") ||
      p.endsWith(".py") ||
      p.endsWith(".rb")
    ) {
      layerPaths.backend.push(path);
    }
    if (
      p.includes("prisma/") ||
      p.includes("migrations/") ||
      p.includes("db/") ||
      p.endsWith(".sql")
    ) {
      layerPaths.database.push(path);
    }
  });
  return layerPaths;
}

const NODE_BASE = {
  borderRadius: 999,
  paddingInline: 14,
  paddingBlock: 8,
  border: "1px solid rgb(56 189 248)",
  background: "rgba(15,23,42,0.9)",
  color: "rgb(226 232 240)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(15,23,42,0.75)",
};
const NODE_SELECTED = {
  ...NODE_BASE,
  border: "2px solid rgb(56 189 248)",
  background: "rgba(30,58,138,0.4)",
  boxShadow: "0 0 24px rgba(56,189,248,0.4)",
};

export default function ArchitectureGraphPanel({
  analysis,
  onHighlightPaths,
  onSelectFile,
  highlightedNodeId,
}: Props) {
  const [selectedId, setSelectedId] = useState<ArchitectureGraphLayerId | null>(null);

  const filePaths = useMemo(
    () => collectFilePaths(analysis.fileTree),
    [analysis.fileTree]
  );
  const layerToPaths = useMemo(() => buildLayerToPaths(filePaths), [filePaths]);

  const layerPresence = useMemo(() => {
    const keys = LAYER_ORDER.filter((id) => layerToPaths[id].length > 0);
    return keys;
  }, [layerToPaths]);

  const initialNodes = useMemo((): Node[] => {
    const baseY = 120;
    const gapX = 180;
    return layerPresence.map((id, index) => ({
      id,
      data: {
        label: id.charAt(0).toUpperCase() + id.slice(1),
        pathCount: layerToPaths[id].length,
      },
      position: { x: 60 + index * gapX, y: baseY },
      style: NODE_BASE,
    }));
  }, [layerPresence, layerToPaths]);

  const initialEdges = useMemo((): Edge[] => {
    const e: Edge[] = [];
    for (let i = 0; i < layerPresence.length - 1; i++) {
      const source = layerPresence[i]!;
      const target = layerPresence[i + 1]!;
      e.push({
        id: `${source}->${target}`,
        source,
        target,
        animated: true,
        style: { stroke: "rgb(56 189 248)", strokeWidth: 1.5 },
        label: "depends on",
        labelStyle: { fill: "#94a3b8", fontSize: 9 },
        labelBgStyle: { fill: "#0f172a" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      });
    }
    return e;
  }, [layerPresence]);

  const layerKey = layerPresence.join(",");
  const initialRef = useRef({ initialNodes, initialEdges });
  initialRef.current = { initialNodes, initialEdges };
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const effectiveHighlight = highlightedNodeId ?? selectedId;

  useEffect(() => {
    setNodes(initialRef.current.initialNodes);
    setEdges(initialRef.current.initialEdges);
  }, [layerKey, setNodes, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: n.id === effectiveHighlight ? NODE_SELECTED : NODE_BASE,
      }))
    );
  }, [effectiveHighlight, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const id = node.id as ArchitectureGraphLayerId;
      if (!LAYER_ORDER.includes(id)) return;
      const paths = layerToPaths[id] ?? [];
      setSelectedId(id);
      onHighlightPaths?.(paths);
      if (paths.length > 0 && onSelectFile) onSelectFile(paths[0]!);
    },
    [layerToPaths, onHighlightPaths, onSelectFile]
  );

  return (
    <section className="glass-panel h-[420px] border-slate-800/80 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-100">
          Architecture graph
        </h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Click a node to highlight related files · Module dependencies
        </span>
      </div>
      <div className="h-full rounded-xl border border-slate-800 bg-slate-950/80">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        >
          <MiniMap
            nodeColor={() => "#0f172a"}
            maskColor="#020617"
            style={{ background: "#020617" }}
          />
          <Controls />
          <Background gap={16} color="#1f2937" />
        </ReactFlow>
      </div>
    </section>
  );
}

