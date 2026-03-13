"use client";

import type { RepoAnalysis, FileNode } from "@/types/repo";
import { Background, Controls, ReactFlow, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";

interface Props {
  analysis: RepoAnalysis;
}

export default function ArchitectureGraphPanel({ analysis }: Props) {
  const allPaths = useMemo(() => {
    const paths: string[] = [];
    const walk = (node: FileNode) => {
      if (node.type === "file") {
        paths.push(node.path.toLowerCase());
      }
      node.children?.forEach(walk);
    };
    analysis.fileTree.forEach(walk);
    return paths;
  }, [analysis.fileTree]);

  const hasAny = (predicates: ((p: string) => boolean)[]): boolean =>
    allPaths.some((p) => predicates.some((fn) => fn(p)));

  const layerPresence = useMemo(() => {
    const frontend = hasAny([
      (p) => p.startsWith("app/"),
      (p) => p.startsWith("pages/"),
      (p) => p.includes("components/"),
      (p) => p.endsWith(".tsx"),
      (p) => p.endsWith(".jsx")
    ]);
    const api = hasAny([
      (p) => p.includes("/api/"),
      (p) => p.startsWith("app/api"),
      (p) => p.startsWith("pages/api")
    ]);
    const backend = hasAny([
      (p) => p.includes("server/"),
      (p) => p.includes("backend/"),
      (p) => p.includes("controllers/"),
      (p) => p.endsWith(".go"),
      (p) => p.endsWith(".py"),
      (p) => p.endsWith(".rb")
    ]);
    const database = hasAny([
      (p) => p.includes("prisma/"),
      (p) => p.includes("migrations/"),
      (p) => p.includes("db/"),
      (p) => p.endsWith(".sql")
    ]);
    return { frontend, api, backend, database };
  }, [allPaths]);

  const nodes = useMemo(() => {
    const baseY = 120;
    const gapX = 180;

    const makeNode = (id: string, label: string, index: number) => ({
      id,
      data: { label },
      position: { x: 60 + index * gapX, y: baseY },
      style: {
        borderRadius: 999,
        paddingInline: 14,
        paddingBlock: 8,
        border: "1px solid rgb(56 189 248)",
        background: "rgba(15,23,42,0.9)",
        color: "rgb(226 232 240)",
        fontSize: 12,
        boxShadow: "0 18px 40px rgba(15,23,42,0.75)"
      }
    });

    const result: any[] = [];
    let index = 0;
    if (layerPresence.frontend)
      result.push(makeNode("frontend", "Frontend", index++));
    if (layerPresence.api) result.push(makeNode("api", "API", index++));
    if (layerPresence.backend)
      result.push(makeNode("backend", "Backend", index++));
    if (layerPresence.database)
      result.push(makeNode("database", "Database", index++));

    return result;
  }, [layerPresence]);

  const edges = useMemo(
    () => {
      const e: any[] = [];
      const addEdge = (source: string, target: string) => {
        if (!nodes.find((n) => n.id === source) || !nodes.find((n) => n.id === target)) {
          return;
        }
        e.push({
          id: `${source}->${target}`,
          source,
          target,
          animated: true,
          style: { stroke: "rgb(56 189 248)", strokeWidth: 1.5 }
        });
      };

      // Example flow: Frontend -> API -> Backend -> Database
      addEdge("frontend", "api");
      addEdge("api", "backend");
      addEdge("backend", "database");

      return e;
    },
    [nodes]
  );

  return (
    <section className="glass-panel h-[420px] border-slate-800/80 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-100">
          Architecture Visualization
        </h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          React Flow
        </span>
      </div>
      <div className="h-full rounded-xl border border-slate-800 bg-slate-950/80">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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

