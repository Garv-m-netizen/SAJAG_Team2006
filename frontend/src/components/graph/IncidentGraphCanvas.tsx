import React, { useState, useMemo } from 'react';
import { GraphData, GraphNode } from '../../types';
import { Network, ZoomIn, ZoomOut, Maximize2, Filter, X } from 'lucide-react';

interface IncidentGraphCanvasProps {
  data: GraphData | null;
  onNodeClick?: (node: GraphNode) => void;
  isLoading?: boolean;
}

const WIDTH = 900;
const HEIGHT = 560;

const EDGE_STYLES: Record<string, { color: string; label: string; dash?: string }> = {
  duplicate: { color: '#EF4444', label: 'Duplicate' },
  recurring_pattern: { color: '#F59E0B', label: 'Recurring pattern' },
  downstream_risk: { color: '#8B5CF6', label: 'Downstream risk', dash: '5 4' },
  infrastructure_adjacent: { color: '#0D9488', label: 'Near infrastructure' },
  member_of: { color: '#94A3B8', label: 'Cluster member' }
};

const edgeColor = (rel: string) => EDGE_STYLES[rel]?.color ?? '#9CA3AF';

const nodeColor = (node: GraphNode) => {
  if (node.type === 'cluster') return '#F59E0B';
  if (node.type === 'infrastructure') return '#6366F1';
  const p = node.priority ?? 50;
  if (p >= 75) return '#DC2626';
  if (p >= 55) return '#D97706';
  return '#0F766E';
};

const nodeRadius = (node: GraphNode) => {
  if (node.type === 'cluster') return 17;
  if (node.type === 'infrastructure') return 11;
  return 8 + Math.min(6, Math.max(0, ((node.priority ?? 50) - 40) / 10));
};

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// Small deterministic force simulation: repulsion between all nodes, springs along edges,
// gentle pull to the centre. Seeded from a ring so the result is stable between renders.
function computeLayout(nodes: GraphNode[], edges: { source: string; target: string }[]) {
  const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const angle = (i / Math.max(1, n)) * Math.PI * 2;
    const r = 120 + ((i * 37) % 140);
    pos.set(node.id, { x: WIDTH / 2 + r * Math.cos(angle), y: HEIGHT / 2 + r * Math.sin(angle), vx: 0, vy: 0 });
  });
  const links = edges.filter((e) => pos.has(e.source) && pos.has(e.target));

  for (let iter = 0; iter < 280; iter++) {
    const alpha = 1 - iter / 280;
    // repulsion
    for (let i = 0; i < n; i++) {
      const a = pos.get(nodes[i].id)!;
      for (let j = i + 1; j < n; j++) {
        const b = pos.get(nodes[j].id)!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = 1; dy = 0.5; d2 = 1.25; }
        const d = Math.sqrt(d2);
        const f = (2600 / d2) * alpha;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
    }
    // springs
    for (const l of links) {
      const a = pos.get(l.source)!;
      const b = pos.get(l.target)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 90) * 0.02 * alpha;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    // centering + integrate
    pos.forEach((p) => {
      p.vx += (WIDTH / 2 - p.x) * 0.004;
      p.vy += (HEIGHT / 2 - p.y) * 0.004;
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.6; p.vy *= 0.6;
      p.x = Math.max(50, Math.min(WIDTH - 50, p.x));
      p.y = Math.max(40, Math.min(HEIGHT - 40, p.y));
    });
  }
  const out = new Map<string, { x: number; y: number }>();
  pos.forEach((p, id) => out.set(id, { x: p.x, y: p.y }));
  return out;
}

export const IncidentGraphCanvas: React.FC<IncidentGraphCanvasProps> = ({ data, onNodeClick, isLoading = false }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');

  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    return filterType === 'all' ? data.nodes : data.nodes.filter((n) => n.type === filterType);
  }, [data, filterType]);

  const nodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.filter(
      (e) =>
        nodeIds.has(e.source) &&
        nodeIds.has(e.target) &&
        (selectedRelationship === 'all' || e.relationship === selectedRelationship)
    );
  }, [data, nodeIds, selectedRelationship]);

  const positions = useMemo(() => computeLayout(filteredNodes, filteredEdges), [filteredNodes, filteredEdges]);

  // Neighbours of the focused (hovered or selected) node, used to dim everything else
  const focusId = hoverId ?? selectedNode?.id ?? null;
  const neighbours = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    filteredEdges.forEach((e) => {
      if (e.source === focusId) set.add(e.target);
      if (e.target === focusId) set.add(e.source);
    });
    return set;
  }, [focusId, filteredEdges]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  // Zoom by shrinking/growing the viewBox around the centre so text stays crisp
  const vbW = WIDTH / zoom;
  const vbH = HEIGHT / zoom;
  const viewBox = `${(WIDTH - vbW) / 2} ${(HEIGHT - vbH) / 2} ${vbW} ${vbH}`;

  const counts = useMemo(() => {
    const nodes = data?.nodes ?? [];
    return {
      incident: nodes.filter((n) => n.type === 'incident').length,
      cluster: nodes.filter((n) => n.type === 'cluster').length,
      infrastructure: nodes.filter((n) => n.type === 'infrastructure').length
    };
  }, [data]);

  const selectClass =
    'px-2 py-1 bg-white border border-[#E5E7EB] rounded text-xs text-[#374151] focus:ring-1 focus:ring-teal-500 outline-none';

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 bg-[#F8F9FA] border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#0F766E]" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
            <option value="all">All nodes ({data?.nodes.length || 0})</option>
            <option value="incident">Incidents ({counts.incident})</option>
            <option value="cluster">Clusters ({counts.cluster})</option>
            <option value="infrastructure">Infrastructure ({counts.infrastructure})</option>
          </select>
          <select value={selectedRelationship} onChange={(e) => setSelectedRelationship(e.target.value)} className={selectClass}>
            <option value="all">All relationships</option>
            {Object.entries(EDGE_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded p-0.5">
          <button onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))} className="p-1 hover:bg-gray-100 rounded text-[#4B5563]" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] px-1 text-[#6C757D] font-mono w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))} className="p-1 hover:bg-gray-100 rounded text-[#4B5563]" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(1)} className="p-1 hover:bg-gray-100 rounded text-[#4B5563]" title="Reset zoom">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-gradient-to-b from-[#FAFCFC] to-[#F1F5F9]" style={{ height: 560 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div className="flex items-center gap-2 text-xs font-medium text-[#0F766E]">
              <Network className="w-4 h-4 animate-spin" />
              Computing incident relationship topology...
            </div>
          </div>
        )}

        {!isLoading && filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
            No graph nodes match the current filters.
          </div>
        )}

        <svg viewBox={viewBox} className="w-full h-full" onClick={() => setSelectedNode(null)}>
          <defs>
            <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#E2E8F0" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect x={-200} y={-200} width={WIDTH + 400} height={HEIGHT + 400} fill="url(#graph-grid)" opacity={0.7} />

          {/* Edges */}
          {filteredEdges.map((edge, idx) => {
            const a = positions.get(edge.source);
            const b = positions.get(edge.target);
            if (!a || !b) return null;
            const active = !neighbours || (neighbours.has(edge.source) && neighbours.has(edge.target) && (edge.source === focusId || edge.target === focusId));
            return (
              <line
                key={`edge-${idx}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={edgeColor(edge.relationship)}
                strokeWidth={active && neighbours ? 2.4 : Math.max(1.2, edge.confidence * 2)}
                strokeDasharray={EDGE_STYLES[edge.relationship]?.dash}
                strokeLinecap="round"
                opacity={active ? 0.75 : 0.08}
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const p = positions.get(node.id);
            if (!p) return null;
            const r = nodeRadius(node);
            const color = nodeColor(node);
            const isSelected = selectedNode?.id === node.id;
            const dimmed = neighbours ? !neighbours.has(node.id) : false;
            const showLabel = node.type !== 'incident' || isSelected || node.id === hoverId || (neighbours?.has(node.id) ?? false);

            return (
              <g
                key={node.id}
                transform={`translate(${p.x}, ${p.y})`}
                opacity={dimmed ? 0.18 : 1}
                className="cursor-pointer"
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
              >
                {(isSelected || node.id === hoverId) && (
                  <circle r={r + 6} fill={color} opacity={0.18} />
                )}
                {isSelected && <circle r={r + 5} fill="none" stroke="#0F766E" strokeWidth={2} strokeDasharray="3 2" />}

                {node.type === 'cluster' ? (
                  <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={6} fill={color} stroke="white" strokeWidth={2.5} />
                ) : node.type === 'infrastructure' ? (
                  <rect x={-r * 0.8} y={-r * 0.8} width={r * 1.6} height={r * 1.6} transform="rotate(45)" fill={color} stroke="white" strokeWidth={2} />
                ) : (
                  <circle r={r} fill={color} stroke="white" strokeWidth={2} />
                )}

                {showLabel && (
                  <text
                    y={r + 13}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={500}
                    fill="#1F2937"
                    stroke="white"
                    strokeWidth={3}
                    paintOrder="stroke"
                    className="select-none pointer-events-none"
                  >
                    {truncate(node.label, 24)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg border border-[#E5E7EB] p-2.5 text-[10px] text-[#4B5563] space-y-1.5 shadow-xs">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />Urgent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />Medium</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />Standard</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#F59E0B]" />Cluster</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rotate-45 bg-[#6366F1]" />Asset</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-gray-200">
            {Object.entries(EDGE_STYLES).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="w-4 h-0.5 rounded" style={{ background: v.color }} />{v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Inspector */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-72 max-w-[calc(100%-1.5rem)] bg-white rounded-lg border border-[#E5E7EB] shadow-lg p-4 z-20 text-xs">
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#F1F3F5] mb-2">
              <div className="min-w-0">
                <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white mb-1" style={{ background: nodeColor(selectedNode) }}>
                  {selectedNode.type}
                </span>
                <p className="font-semibold text-sm text-[#111827] leading-snug">{selectedNode.label}</p>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#6C757D]">Sector / Zone</span>
                <span className="font-medium text-[#111827]">{selectedNode.sector || 'Chandigarh'}</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#6C757D]">Priority index</span>
                  <span className="font-bold text-[#0F766E]">{Math.round(selectedNode.priority ?? 50)}/100</span>
                </div>
                <div className="h-1.5 rounded bg-gray-100 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.round(selectedNode.priority ?? 50)}%`, background: nodeColor(selectedNode) }} />
                </div>
              </div>

              {selectedNode.metadata?.title && (
                <div className="pt-2 border-t border-[#F1F3F5]">
                  <p className="font-semibold text-[#1F2937]">{selectedNode.metadata.title}</p>
                  <p className="text-[11px] text-[#4B5563] mt-1 line-clamp-3">{selectedNode.metadata.description}</p>
                </div>
              )}

              {selectedNode.metadata?.notes && (
                <div className="pt-2 border-t border-[#F1F3F5]">
                  <p className="font-medium text-[#374151] text-[11px]">Asset notes</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{selectedNode.metadata.notes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#F1F3F5]">
                <p className="font-semibold text-[#1F2937] text-[11px] mb-1">Relationships</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(data?.edges ?? [])
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#F8F9FA] border-l-4 text-[10px]" style={{ borderLeftColor: edgeColor(e.relationship) }}>
                        <div className="flex items-center justify-between font-medium">
                          <span className="capitalize" style={{ color: edgeColor(e.relationship) }}>
                            {(EDGE_STYLES[e.relationship]?.label ?? e.relationship.replace(/_/g, ' '))}
                          </span>
                          <span className="text-gray-500">{Math.round(e.confidence * 100)}%</span>
                        </div>
                        <p className="text-gray-600 mt-0.5 leading-snug">{e.explanation}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 bg-[#F8F9FA] border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6C757D]">
        <span>{filteredNodes.length} nodes • {filteredEdges.length} edges — hover a node to trace its connections, click for details</span>
        <span className="hidden sm:inline">Proximity ≤ 300m • Similarity ≥ 0.20</span>
      </div>
    </div>
  );
};
