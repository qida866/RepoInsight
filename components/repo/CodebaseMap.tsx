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
import { useMemo } from "react";

interface CodebaseMapProps {
  tree: FileNode[];
}

type LayerId =
  | "frontend"
  | "api"
  | "backend"
  | "data"
  | "config"
  | "tests"
  | "scripts";

interface LayerDef {
  id: LayerId;
  label: string;
  description: string;
}

const LAYERS: LayerDef[] = [
  {
    id: "frontend",
    label: "Frontend",
    description: "Pages, UI components, and client-side code."
  },
  {
    id: "api",
    label: "API",
    description: "HTTP routes, controllers, and API handlers."
  },
  {
    id: "backend",
    label: "Backend",
    description: "Server logic, services, and domain layer."
  },
  {
    id: "data",
    label: "Data",
    description: "Models, database access, and persistence."
  },
  {
    id: "config",
    label: "Config",
    description: "Configuration, settings, and environment."
  },
  {
    id: "tests",
    label: "Tests",
    description: "Unit, integration, and end-to-end tests."
  },
  {
    id: "scripts",
    label: "Scripts",
    description: "CLIs, scripts, and automation tooling."
  }
];

export default function CodebaseMap({ tree }: CodebaseMapProps) {
  const { nodes, edges } = useMemo(() => {
    const filePaths: string[] = [];

    const walk = (node: FileNode) => {
      if (node.type === "file") {
        filePaths.push(node.path);
      }
      node.children?.forEach(walk);
    };
    tree.forEach(walk);

    const lowerPaths = filePaths.map((p) => p.toLowerCase());
    const hasAny = (predicates: ((p: string) => boolean)[]) =>
      lowerPaths.some((p) => predicates.some((fn) => fn(p)));

    const layerFolders: Record<LayerId, string[]> = {
      frontend: [],
      api: [],
      backend: [],
      data: [],
      config: [],
      tests: [],
      scripts: []
    };

    const topLevelFolders = Array.from(
      new Set(
        filePaths
          .map((p) => p.split("/")[0] ?? "")
          .filter((name) => name.length > 0)
      )
    );

    const assignIfMatch = (
      layer: LayerId,
      folder: string,
      hints: string[]
    ) => {
      const lower = folder.toLowerCase();
      if (hints.some((h) => lower.startsWith(h))) {
        layerFolders[layer].push(folder);
      }
    };

    for (const folder of topLevelFolders) {
      assignIfMatch("frontend", folder, ["pages", "components", "ui", "client"]);
      assignIfMatch("backend", folder, ["server", "services", "controllers"]);
      assignIfMatch("api", folder, ["api", "routes"]);
      assignIfMatch("data", folder, ["models", "database", "db", "prisma"]);
      assignIfMatch("config", folder, ["config"]);
      assignIfMatch("tests", folder, ["tests", "test", "__tests__"]);
      assignIfMatch("scripts", folder, ["scripts", "bin", "tools"]);
    }

    // Fallback to path-based detection if no top-level folders matched
    if (layerFolders.frontend.length === 0) {
      if (
        hasAny([
          (p) => p.includes("/pages/"),
          (p) => p.includes("/components/"),
          (p) => p.includes("/ui/")
        ])
      ) {
        layerFolders.frontend.push("frontend");
      }
    }
    if (layerFolders.api.length === 0) {
      if (
        hasAny([
          (p) => p.includes("/api/"),
          (p) => p.includes("/routes/")
        ])
      ) {
        layerFolders.api.push("api");
      }
    }
    if (layerFolders.backend.length === 0) {
      if (
        hasAny([
          (p) => p.includes("/server"),
          (p) => p.includes("/services/"),
          (p) => p.includes("/controllers/")
        ])
      ) {
        layerFolders.backend.push("backend");
      }
    }
    if (layerFolders.data.length === 0) {
      if (
        hasAny([
          (p) => p.includes("/models/"),
          (p) => p.includes("/db/"),
          (p) => p.includes("database"),
          (p) => p.includes("prisma/")
        ])
      ) {
        layerFolders.data.push("data");
      }
    }
    if (layerFolders.config.length === 0) {
      if (
        hasAny([
          (p) => p.includes("/config/"),
          (p) => p.endsWith(".env"),
          (p) => p.includes(".env."),
          (p) => p.includes("settings")
        ])
      ) {
        layerFolders.config.push("config");
      }
    }
    if (layerFolders.tests.length === 0) {
      if (
        hasAny([
          (p) => p.includes("/tests/"),
          (p) => p.includes("/__tests__/"),
          (p) => p.endsWith(".spec.ts") || p.endsWith(".test.ts") || p.endsWith(".spec.js")
        ])
      ) {
        layerFolders.tests.push("tests");
      }
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const activeLayers = LAYERS.filter((layer) => layerFolders[layer.id].length > 0);

    activeLayers.forEach((layer, index) => {
      const x = index * 220;
      const y = 0;
      const folders = layerFolders[layer.id];

      nodes.push({
        id: layer.id,
        data: {
          label: (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-100">
                  {layer.label}
                </span>
                <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-400">
                  {folders.length} folder{folders.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{layer.description}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {folders.slice(0, 4).map((folder) => (
                  <span
                    key={folder}
                    className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-[10px] text-slate-100"
                  >
                    {folder}
                  </span>
                ))}
              </div>
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
          minWidth: 200,
          maxWidth: 260
        }
      });
    });

    const order: LayerId[] = [
      "frontend",
      "api",
      "backend",
      "data",
      "config",
      "tests",
      "scripts"
    ];

    for (let i = 0; i < order.length - 1; i++) {
      const from = order[i]!;
      const to = order[i + 1]!;
      const fromActive = activeLayers.find((l) => l.id === from);
      const toActive = activeLayers.find((l) => l.id === to);
      if (fromActive && toActive) {
        edges.push({
          id: `${from}->${to}`,
          source: from,
          target: to,
          animated: true,
          style: { stroke: "rgba(56,189,248,0.9)", strokeWidth: 1.6 }
        });
      }
    }

    return { nodes, edges };
  }, [tree]);

  return (
    <div className="h-[420px] w-full rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        className="w-full h-full dark-theme"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        minZoom={0.2}
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

