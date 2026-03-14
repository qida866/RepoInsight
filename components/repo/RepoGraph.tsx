"use client";

import type { FileNode } from "@/types/repo";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";

interface DependencyGraph {
  nodes: { id: string }[];
  edges: { id: string; source: string; target: string }[];
}

interface RepoGraphProps {
  tree: FileNode[];
  dependencyGraph?: DependencyGraph;
  /** Paths to highlight in the dependency graph (e.g. from ArchitectureMap layer selection). */
  highlightedNodeIds?: string[] | null;
  /** Called when user clicks a node in the dependency graph; syncs with ArchitectureMap. */
  onNodeClick?: (nodeId: string) => void;
}

export default function RepoGraph({
  tree,
  dependencyGraph,
  highlightedNodeIds = null,
  onNodeClick,
}: RepoGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const highlightSet = useMemo(
    () => (highlightedNodeIds?.length ? new Set(highlightedNodeIds) : null),
    [highlightedNodeIds]
  );

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // If a dependency graph is provided, render a file-level dependency view
    if (dependencyGraph && dependencyGraph.nodes.length > 0) {
      dependencyGraph.nodes.forEach((n, index) => {
        const x = (index % 4) * 260;
        const y = Math.floor(index / 4) * 90;
        flowNodes.push({
          id: n.id,
          data: {
            label: (
              <span className="truncate font-mono text-[11px] text-slate-100" title={n.id}>
                {n.id.split("/").pop() ?? n.id}
              </span>
            )
          },
          position: { x, y },
          type: "default",
          draggable: true,
          style: {
            borderRadius: 999,
            padding: "6px 10px",
            border: "1px solid rgba(148,163,184,0.9)",
            background: "rgba(15,23,42,0.96)",
            color: "rgb(226,232,240)",
            fontSize: 11,
            boxShadow: "0 8px 20px rgba(15,23,42,0.7)",
            maxWidth: 260
          }
        });
      });

      dependencyGraph.edges.forEach((e) => {
        flowEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: "rgba(56,189,248,0.9)", strokeWidth: 1.4 }
        });
      });

      return { nodes: flowNodes, edges: flowEdges };
    }

    // Flatten tree into list of file paths
    const paths: string[] = [];
    const walk = (node: FileNode) => {
      if (node.type === "file") {
        paths.push(node.path);
      }
      node.children?.forEach(walk);
    };
    tree.forEach(walk);

    const lowerPaths = paths.map((p) => p.toLowerCase());
    const hasAny = (predicates: ((p: string) => boolean)[]) =>
      lowerPaths.some((p) => predicates.some((fn) => fn(p)));

    type LayerId = "frontend" | "api" | "backend" | "data" | "config" | "tests";

    const layerDefs: { id: LayerId; label: string; hints: ((p: string) => boolean)[] }[] =
      [
        {
          id: "frontend",
          label: "Frontend",
          hints: [
            (p) => p.includes("/pages/"),
            (p) => p.startsWith("pages/"),
            (p) => p.includes("/components/"),
            (p) => p.startsWith("components/"),
            (p) => p.includes("/ui/"),
            (p) => p.startsWith("ui/")
          ]
        },
        {
          id: "api",
          label: "API",
          hints: [
            (p) => p.includes("/api/"),
            (p) => p.startsWith("api/"),
            (p) => p.includes("/routes/"),
            (p) => p.startsWith("routes/")
          ]
        },
        {
          id: "backend",
          label: "Backend",
          hints: [
            (p) => p.includes("/server"),
            (p) => p.startsWith("server/"),
            (p) => p.includes("/services/"),
            (p) => p.startsWith("services/"),
            (p) => p.includes("/controllers/"),
            (p) => p.startsWith("controllers/")
          ]
        },
        {
          id: "data",
          label: "Data",
          hints: [
            (p) => p.includes("/models/"),
            (p) => p.startsWith("models/"),
            (p) => p.includes("/db/"),
            (p) => p.startsWith("db/"),
            (p) => p.includes("database")
          ]
        },
        {
          id: "config",
          label: "Config",
          hints: [
            (p) => p.startsWith("config/"),
            (p) => p.includes("/config/"),
            (p) => p.endsWith(".env"),
            (p) => p.includes(".env."),
            (p) => p.includes("settings")
          ]
        },
        {
          id: "tests",
          label: "Tests",
          hints: [
            (p) => p.includes("/tests/"),
            (p) => p.startsWith("tests/"),
            (p) => p.includes("/__tests__/"),
            (p) => p.endsWith(".spec.ts") || p.endsWith(".test.ts") || p.endsWith(".spec.js")
          ]
        }
      ];

    const layersWithSamples = layerDefs
      .map((layer) => {
        const matched = paths.filter((original, idx) =>
          layer.hints.some((fn) => fn(lowerPaths[idx] ?? ""))
        );
        return { ...layer, matched };
      })
      .filter((l) => l.matched.length > 0);

    // Create one node per detected layer
    layersWithSamples.forEach((layer, index) => {
      const x = index * 220;
      const y = 0;
      const sample = layer.matched.slice(0, 3);

      flowNodes.push({
        id: layer.id,
        data: {
          label: (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-100">
                {layer.label}
              </span>
              <span className="text-[10px] text-slate-400">
                {layer.matched.length} file
                {layer.matched.length === 1 ? "" : "s"}
              </span>
              {sample.length > 0 && (
                <ul className="space-y-0.5 text-[10px] text-slate-200">
                  {sample.map((p) => (
                    <li key={p} className="truncate font-mono">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        },
        position: { x, y },
        type: "default",
        draggable: true,
        style: {
          borderRadius: 16,
          padding: "10px 12px",
          border: "1px solid rgba(56,189,248,0.8)",
          background: "rgba(15,23,42,0.96)",
          color: "rgb(226,232,240)",
          fontSize: 12,
          boxShadow: "0 10px 24px rgba(15,23,42,0.75)",
          minWidth: 180,
          maxWidth: 260
        }
      });
    });

    // Connect layers in a typical flow: frontend -> api -> backend -> data -> config -> tests
    const orderedLayers: LayerId[] = [
      "frontend",
      "api",
      "backend",
      "data",
      "config",
      "tests"
    ];

    for (let i = 0; i < orderedLayers.length - 1; i++) {
      const from = orderedLayers[i]!;
      const to = orderedLayers[i + 1]!;
      if (
        layersWithSamples.some((l) => l.id === from) &&
        layersWithSamples.some((l) => l.id === to)
      ) {
        flowEdges.push({
          id: `${from}->${to}`,
          source: from,
          target: to,
          animated: true,
          style: { stroke: "rgba(56,189,248,0.9)", strokeWidth: 1.6 }
        });
      }
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [tree, dependencyGraph]);

  const relatedNodeIds = useMemo(() => {
    if (!selectedId || !dependencyGraph) return null;
    const set = new Set<string>([selectedId]);
    for (const e of dependencyGraph.edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [selectedId, dependencyGraph]);

  const isEdgeHighlight = (e: Edge) =>
    !!relatedNodeIds && (e.source === selectedId || e.target === selectedId);
  const isNodeHighlight = (n: Node) =>
    !relatedNodeIds || relatedNodeIds.has(n.id);
  const isLayerHighlighted = (nodeId: string) => !!highlightSet?.has(nodeId);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      {dependencyGraph && dependencyGraph.nodes.length > 0 && (
        <div className="absolute left-3 top-3 z-10 rounded border border-slate-700 bg-slate-900/95 px-2 py-1 text-[10px] text-slate-400">
          Click a node to highlight its dependencies (imports) and dependents
        </div>
      )}
      <ReactFlow
        nodes={nodes.map((n) => {
          const selected = selectedId && n.id === selectedId;
          const inLayer = isLayerHighlighted(n.id);
          return {
            ...n,
            style: {
              ...(n.style || {}),
              opacity: isNodeHighlight(n) ? 1 : 0.35,
              border:
                selected
                  ? "2px solid rgba(56,189,248,1)"
                  : inLayer
                    ? "2px solid rgba(52,211,153,0.85)"
                    : isNodeHighlight(n)
                      ? n.style?.border
                      : "1px solid rgba(100,116,139,0.5)",
              background:
                selected
                  ? "rgba(15,23,42,0.98)"
                  : inLayer
                    ? "rgba(6,78,59,0.35)"
                    : n.style?.background,
              boxShadow: inLayer && !selected ? "0 0 0 1px rgba(52,211,153,0.3)" : undefined,
            },
          };
        })}
        edges={edges.map((e) => ({
          ...e,
          style: {
            ...(e.style || {}),
            opacity: isEdgeHighlight(e) ? 1 : 0.25,
            stroke:
              isEdgeHighlight(e)
                ? "rgba(56,189,248,1)"
                : e.style?.stroke ?? "rgba(56,189,248,0.9)",
            strokeWidth: isEdgeHighlight(e) ? 2.2 : 1.2
          }
        }))}
        onNodeClick={(_, node) => {
          setSelectedId((prev) => (prev === node.id ? null : node.id));
          onNodeClick?.(node.id);
        }}
        onPaneClick={() => setSelectedId(null)}
        className="w-full h-full dark-theme"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
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
    </div>
  );
}

