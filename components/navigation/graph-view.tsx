"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import {
  buildDocumentGraph,
  type GraphNode,
  type GraphEdge,
} from "@/lib/relationships/graph";

interface GraphViewProps {
  activeId?: string;
  onNavigate: (docId: string) => void;
  onClose: () => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function GraphView({ activeId, onNavigate, onClose }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const dragRef = useRef<{ nodeId: string | null; startX: number; startY: number; isPanning: boolean }>({
    nodeId: null,
    startX: 0,
    startY: 0,
    isPanning: false,
  });
  const animRef = useRef<number>(0);

  const graph = useMemo(() => buildDocumentGraph(), []);

  useEffect(() => {
    const w = 600;
    const h = 400;
    nodesRef.current = graph.nodes.map((n, i) => ({
      ...n,
      x: w / 2 + Math.cos((i / graph.nodes.length) * Math.PI * 2) * 150,
      y: h / 2 + Math.sin((i / graph.nodes.length) * Math.PI * 2) * 120,
      vx: 0,
      vy: 0,
    }));
    edgesRef.current = graph.edges;
  }, [graph]);

  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const w = 600;
    const h = 400;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 800 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - 120) * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    for (const node of nodes) {
      const cx = w / 2;
      const cy = h / 2;
      node.vx += (cx - node.x) * 0.001;
      node.vy += (cy - node.y) * 0.001;
      node.vx *= 0.9;
      node.vy *= 0.9;
      if (dragRef.current.nodeId !== node.id) {
        node.x += node.vx;
        node.y += node.vy;
      }
      node.x = Math.max(40, Math.min(w - 40, node.x));
      node.y = Math.max(40, Math.min(h - 40, node.y));
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 600;
    const h = 400;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = "#d4d4d4";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const node of nodes) {
      const r = 6 + Math.min(node.linkCount * 2, 12);
      const isActive = node.id === activeId;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#171717" : "#e5e5e5";
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = "#a3a3a3";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = isActive ? "#171717" : "#525252";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      const label =
        node.title.length > 18
          ? node.title.slice(0, 16) + "..."
          : node.title;
      ctx.fillText(label, node.x, node.y + r + 14);
    }

    ctx.restore();

    simulate();
    animRef.current = requestAnimationFrame(draw);
  }, [activeId, zoom, offset, simulate]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - offset.x) / zoom;
      const my = (e.clientY - rect.top - offset.y) / zoom;

      for (const node of nodesRef.current) {
        const r = 6 + Math.min(node.linkCount * 2, 12);
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < (r + 4) * (r + 4)) {
          onNavigate(node.id);
          return;
        }
      }
    },
    [onNavigate, zoom, offset]
  );

  return (
    <div className="flex flex-col rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-2">
        <span className="text-sm font-medium text-neutral-900">
          Knowledge Graph
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="cursor-pointer"
        style={{ width: 600, height: 400 }}
      />
      <div className="border-t border-[#e5e5e5] px-4 py-2 text-[11px] text-neutral-400">
        {graph.nodes.length} documents &middot; {graph.edges.length} connections
        &middot; Use [[page title]] to link documents
      </div>
    </div>
  );
}
