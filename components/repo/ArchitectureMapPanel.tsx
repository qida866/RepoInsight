"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";

export type LayerId =
  | "frontend"
  | "backend"
  | "api"
  | "data"
  | "config"
  | "tests"
  | "scripts";

interface LayerDef {
  id: LayerId;
  label: string;
  hints: ((p: string) => boolean)[];
}

const LAYER_DEFS: LayerDef[] = [
  {
    id: "api",
    label: "API",
    hints: [
      (p) => p.includes("/api/") || p.startsWith("api/"),
      (p) => p.includes("/routes/") || p.startsWith("routes/"),
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    hints: [
      (p) => p.includes("/pages/") || p.startsWith("pages/"),
      (p) => p.includes("/components/") || p.startsWith("components/"),
      (p) => p.includes("/ui/") || p.startsWith("ui/"),
      (p) => p.startsWith("app/") && !p.includes("/api/"),
    ],
  },
  {
    id: "backend",
    label: "Backend",
    hints: [
      (p) => p.includes("/server/") || p.startsWith("server/"),
      (p) => p.includes("/services/") || p.startsWith("services/"),
      (p) => p.includes("/controllers/") || p.startsWith("controllers/"),
    ],
  },
  {
    id: "data",
    label: "Data",
    hints: [
      (p) => p.includes("/models/") || p.startsWith("models/"),
      (p) => p.includes("/database/") || p.startsWith("database/"),
      (p) => p.includes("/db/") || p.startsWith("db/"),
      (p) => p.includes("prisma/") || p.includes("migrations/"),
    ],
  },
  {
    id: "config",
    label: "Config",
    hints: [
      (p) => p.includes("/config/") || p.startsWith("config/"),
      (p) => p.endsWith(".env") || p.includes(".env."),
      (p) => p.includes("settings"),
    ],
  },
  {
    id: "tests",
    label: "Tests",
    hints: [
      (p) => p.includes("/tests/") || p.startsWith("tests/"),
      (p) => p.includes("/__tests__/"),
      (p) => p.endsWith(".spec.ts") || p.endsWith(".spec.js") || p.endsWith(".spec.tsx"),
      (p) => p.endsWith(".test.ts") || p.endsWith(".test.js") || p.endsWith(".test.tsx"),
    ],
  },
  {
    id: "scripts",
    label: "Scripts",
    hints: [
      (p) => p.includes("/scripts/") || p.startsWith("scripts/"),
      (p) => p.startsWith("bin/"),
    ],
  },
];

const LAYER_ORDER: LayerId[] = [
  "frontend",
  "api",
  "backend",
  "data",
  "config",
  "tests",
  "scripts",
];

export interface ArchitectureMapPanelProps {
  fileTree: string[];
  /** Currently selected layer (from parent); highlights and filters FileExplorer */
  selectedLayerId?: LayerId | null;
  /** Called when user clicks a layer: highlight paths, filter explorer, optionally select first file */
  onLayerClick?: (layerId: LayerId | null, paths: string[]) => void;
  /** Called when user clicks a file path in an expanded layer (updates FileIntelligencePanel) */
  onSelectFile?: (path: string) => void;
}

function assignToLayer(path: string, lower: string): LayerId | null {
  for (const layer of LAYER_DEFS) {
    if (layer.hints.some((fn) => fn(lower))) return layer.id;
  }
  return null;
}

/**
 * Return the list of architecture layer labels detected in the file tree (e.g. ["Frontend", "API", "Backend"]).
 * Useful for summaries and share cards.
 */
export function getDetectedLayerLabels(fileTree: string[]): string[] {
  const lowerPaths = fileTree.map((p) => p.toLowerCase());
  const present = new Set<LayerId>();
  for (let i = 0; i < fileTree.length; i++) {
    const layerId = assignToLayer(fileTree[i]!, lowerPaths[i]!);
    if (layerId) present.add(layerId);
  }
  return LAYER_ORDER.filter((id) => present.has(id)).map(
    (id) => LAYER_DEFS.find((d) => d.id === id)!.label
  );
}

/**
 * Get the architecture layer that contains the given path and all paths in that layer.
 * Use to sync DependencyGraph selection with ArchitectureMapPanel (e.g. when user clicks a node in the graph).
 */
export function getLayerForPath(
  fileTree: string[],
  path: string
): { layerId: LayerId; paths: string[] } | null {
  const lower = path.toLowerCase();
  const layerId = assignToLayer(path, lower);
  if (!layerId) return null;
  const lowerPaths = fileTree.map((p) => p.toLowerCase());
  const paths = fileTree.filter((_, i) => assignToLayer(fileTree[i]!, lowerPaths[i]!) === layerId);
  return { layerId, paths };
}

const COLORS = {
  default: {
    border: "rgba(71, 85, 105, 0.8)",
    bg: "rgba(15, 23, 42, 0.96)",
    hover: "rgba(30, 41, 59, 0.98)",
  },
  selected: {
    border: "rgba(52, 211, 153, 0.7)",
    bg: "rgba(6, 78, 59, 0.4)",
    ring: "rgba(52, 211, 153, 0.35)",
  },
};

function LayerNodeContent({
  layerId,
  paths,
  isExpanded,
  isSelected,
  onSelectFile,
}: {
  layerId: LayerId;
  paths: string[];
  isExpanded: boolean;
  isSelected: boolean;
  onSelectFile?: (path: string) => void;
}) {
  const def = LAYER_DEFS.find((d) => d.id === layerId)!;
  const displayPaths = isExpanded ? paths : paths.slice(0, 4);
  const hasMore = paths.length > 4 && !isExpanded;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${isSelected ? "text-emerald-100" : "text-slate-100"}`}>
          {def.label}
        </span>
        <span className="text-[10px] text-slate-500 tabular-nums">
          {paths.length} file{paths.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className={`space-y-0.5 text-[10px] overflow-y-auto transition-all duration-200 ${isExpanded ? "max-h-[140px]" : ""}`}>
        {displayPaths.map((p) => (
          <li key={p}>
            {onSelectFile ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFile(p);
                }}
                className="w-full text-left truncate font-mono text-slate-300 hover:text-sky-200 hover:bg-slate-700/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                title={p}
              >
                {p.split("/").pop() ?? p}
              </button>
            ) : (
              <span className="truncate font-mono text-slate-300 block" title={p}>
                {p.split("/").pop() ?? p}
              </span>
            )}
          </li>
        ))}
        {hasMore && (
          <li className="text-slate-500 pt-0.5">
            +{paths.length - 4} more · click to expand
          </li>
        )}
      </ul>
    </div>
  );
}

export default function ArchitectureMapPanel({
  fileTree,
  selectedLayerId = null,
  onLayerClick,
  onSelectFile,
}: ArchitectureMapPanelProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<LayerId>>(new Set());

  const byLayer = useMemo(() => {
    const lowerPaths = fileTree.map((p) => p.toLowerCase());
    const map = new Map<LayerId, string[]>();
    for (let i = 0; i < fileTree.length; i++) {
      const path = fileTree[i]!;
      const lower = lowerPaths[i]!;
      const layerId = assignToLayer(path, lower);
      if (layerId) {
        const list = map.get(layerId) ?? [];
        list.push(path);
        map.set(layerId, list);
      }
    }
    return map;
  }, [fileTree]);

  const presentLayers = useMemo(
    () => LAYER_ORDER.filter((id) => (byLayer.get(id)?.length ?? 0) > 0),
    [byLayer]
  );

  const initialNodes: Node[] = useMemo(() => {
    const flowNodes: Node[] = [];
    presentLayers.forEach((layerId, index) => {
      const paths = byLayer.get(layerId) ?? [];
      const def = LAYER_DEFS.find((d) => d.id === layerId)!;
      const isSelected = selectedLayerId === layerId;
      const isExpanded = expandedLayers.has(layerId);
      const cols = 3;
      const x = (index % cols) * 240;
      const y = Math.floor(index / cols) * 160;

      flowNodes.push({
        id: layerId,
        data: {
          label: (
            <LayerNodeContent
              layerId={layerId}
              paths={paths}
              isExpanded={isExpanded}
              isSelected={isSelected}
              onSelectFile={onSelectFile}
            />
          ),
          layerId,
          paths,
        },
        position: { x, y },
        type: "default",
        draggable: true,
        style: {
          borderRadius: 12,
          padding: "10px 12px",
          border: `2px solid ${isSelected ? COLORS.selected.border : COLORS.default.border}`,
          background: isSelected ? COLORS.selected.bg : COLORS.default.bg,
          boxShadow: isSelected ? `0 0 0 1px ${COLORS.selected.ring}` : "0 8px 24px rgba(15,23,42,0.7)",
          color: "rgb(226,232,240)",
          fontSize: 12,
          minWidth: 180,
          maxWidth: 240,
          transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
        },
      });
    });
    return flowNodes;
  }, [fileTree, byLayer, presentLayers, selectedLayerId, expandedLayers, onSelectFile]);

  const initialEdges: Edge[] = useMemo(() => {
    const flowEdges: Edge[] = [];
    const flowOrder = ["frontend", "api", "backend", "data"];
    for (let i = 0; i < flowOrder.length - 1; i++) {
      const from = flowOrder[i] as LayerId;
      const to = flowOrder[i + 1] as LayerId;
      if (presentLayers.includes(from) && presentLayers.includes(to)) {
        flowEdges.push({
          id: `${from}->${to}`,
          source: from,
          target: to,
          animated: true,
          style: { stroke: "rgba(56,189,248,0.85)", strokeWidth: 1.5 },
        });
      }
    }
    if (presentLayers.includes("config") && presentLayers.includes("frontend")) {
      flowEdges.push({
        id: "config->frontend",
        source: "config",
        target: "frontend",
        animated: false,
        style: { stroke: "rgba(100,116,139,0.6)", strokeWidth: 1 },
      });
    }
    if (presentLayers.includes("tests") && presentLayers.includes("frontend")) {
      flowEdges.push({
        id: "tests->frontend",
        source: "tests",
        target: "frontend",
        animated: false,
        style: { stroke: "rgba(100,116,139,0.6)", strokeWidth: 1 },
      });
    }
    return flowEdges;
  }, [presentLayers]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const layerId = node.id as LayerId;
      const paths = (node.data?.paths as string[]) ?? [];
      setExpandedLayers((prev) => {
        const next = new Set(prev);
        if (next.has(layerId)) next.delete(layerId);
        else next.add(layerId);
        return next;
      });
      const isCurrentlySelected = selectedLayerId === layerId;
      if (isCurrentlySelected) {
        onLayerClick?.(null, []);
      } else {
        onLayerClick?.(layerId, paths);
      }
    },
    [selectedLayerId, onLayerClick]
  );

  const handleClearFilter = useCallback(() => {
    onLayerClick?.(null, []);
  }, [onLayerClick]);

  return (
    <section className="glass-panel border-slate-800/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Architecture map
        </h2>
        <div className="flex items-center gap-2">
          {selectedLayerId && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-[10px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-100"
            >
              Clear filter
            </button>
          )}
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Click layer · React Flow
          </span>
        </div>
      </div>
      <div className="h-[380px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 transition-all duration-200">
        {nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No layers detected. Try a repo with pages/, api/, server/, or similar.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable
            nodesConnectable={false}
            className="w-full h-full react-flow-dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color="#1e293b" />
            <Controls
              className="!bg-slate-900/90 !border-slate-700 !rounded-lg"
              showInteractive={false}
            />
            <MiniMap
              nodeColor="#0f172a"
              maskColor="#020617"
              className="!bg-slate-900 !border-slate-700"
            />
          </ReactFlow>
        )}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Click a layer to highlight and filter files; click a file in the list to open it in the code viewer.
      </p>
    </section>
  );
}
