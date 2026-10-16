import React, { useState, useEffect, useMemo } from 'react';
import { GraphData, GraphNode, GraphEdge } from '../../types';
import { Network, ZoomIn, ZoomOut, Filter, Info, ChevronRight, X } from 'lucide-react';

interface IncidentGraphCanvasProps {
  data: GraphData | null;
  onNodeClick?: (node: GraphNode) => void;
  isLoading?: boolean;
}

export const IncidentGraphCanvas: React.FC<IncidentGraphCanvasProps> = ({
  data,
  onNodeClick,
  isLoading = false
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    if (filterType === 'all') return data.nodes;
    return data.nodes.filter(n => n.type === filterType);
  }, [data, filterType]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    filteredNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [filteredNodes]);

  // Filter edges based on visible nodes and relationship filter
  const filteredEdges = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.filter(e => {
      const hasSrc = nodeMap.has(e.source);
      const hasTgt = nodeMap.has(e.target);
      const matchesRel = selectedRelationship === 'all' || e.relationship === selectedRelationship;
      return hasSrc && hasTgt && matchesRel;
    });
  }, [data, nodeMap, selectedRelationship]);

  // Simple, deterministic 2D force layout coordinates for nodes in SVG
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const count = filteredNodes.length;
    if (count === 0) return positions;

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // Distribute clusters near center, infrastructure on outer ring, incidents orbiting
    filteredNodes.forEach((node, index) => {
      let x = centerX;
      let y = centerY;

      if (node.type === 'cluster') {
        const angle = (index / Math.max(1, count)) * 2 * Math.PI;
        const radius = 110 + (index % 3) * 30;
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      } else if (node.type === 'infrastructure') {
        const angle = (index / Math.max(1, count)) * 2 * Math.PI + 0.5;
        const radius = 210;
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      } else {
        // Incident nodes
        const angle = (index / Math.max(1, count)) * 2 * Math.PI;
        const radius = 160 + ((index * 29) % 120);
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      }

      positions.set(node.id, { x: Math.max(40, Math.min(width - 40, x)), y: Math.max(40, Math.min(height - 40, y)) });
    });

    return positions;
  }, [filteredNodes]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    if (onNodeClick) onNodeClick(node);
  };

  const getEdgeColor = (rel: string) => {
    switch (rel) {
      case 'duplicate': return '#EF4444'; // red
      case 'recurring_pattern': return '#F59E0B'; // amber
      case 'downstream_risk': return '#8B5CF6'; // purple
      case 'infrastructure_adjacent': return '#0D9488'; // teal
      case 'member_of': return '#3B82F6'; // blue
      default: return '#9CA3AF'; // gray
    }
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'cluster') return '#F59E0B'; // Amber
    if (node.type === 'infrastructure') return '#6366F1'; // Indigo
    const p = node.priority || 50;
    if (p >= 75) return '#DC2626'; // High priority red
    if (p >= 55) return '#D97706'; // Medium priority amber
    return '#0F766E'; // Teal
  };

  return (
    <div className="relative bg-white rounded-lg border border-[#E5E7EB] shadow-2xs overflow-hidden">
      {/* Control Toolbar */}
      <div className="p-3 bg-[#F8F9FA] border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-[#374151]">
            <Filter className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Node Filter:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 bg-white border border-[#E5E7EB] rounded text-xs text-[#374151] focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Topologies ({data?.nodes.length || 0})</option>
            <option value="incident">Incidents Only</option>
            <option value="cluster">Canonical Clusters</option>
            <option value="infrastructure">Infrastructure Assets</option>
          </select>

          <div className="flex items-center gap-1.5 font-medium text-[#374151] ml-2">
            <span>Relationship:</span>
          </div>
          <select
            value={selectedRelationship}
            onChange={(e) => setSelectedRelationship(e.target.value)}
            className="px-2 py-1 bg-white border border-[#E5E7EB] rounded text-xs text-[#374151] focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Relationships</option>
            <option value="recurring_pattern">Recurring Pattern</option>
            <option value="downstream_risk">Downstream Risk</option>
            <option value="infrastructure_adjacent">Infrastructure Adjacent</option>
            <option value="member_of">Cluster Membership</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-[#6C757D]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span> Urgent Incident
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></span> Standard Incident
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#F59E0B]"></span> Chronic Cluster
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rotate-45 bg-[#6366F1]"></span> Infrastructure Asset
          </span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded p-0.5">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
            className="p-1 hover:bg-gray-100 rounded text-[#4B5563]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] px-1 text-[#6C757D] font-mono">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
            className="p-1 hover:bg-gray-100 rounded text-[#4B5563]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative h-[500px] overflow-hidden bg-[#FAFCFC]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div className="flex items-center gap-2 text-xs font-medium text-[#0F766E]">
              <Network className="w-4 h-4 animate-spin" />
              Computing incident relationship topology...
            </div>
          </div>
        ) : null}

        <svg
          viewBox="0 0 800 500"
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
        >
          {/* Edges */}
          <g className="edges">
            {filteredEdges.map((edge, idx) => {
              const srcPos = nodePositions.get(edge.source);
              const tgtPos = nodePositions.get(edge.target);
              if (!srcPos || !tgtPos) return null;

              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={getEdgeColor(edge.relationship)}
                    strokeWidth={Math.max(1.2, edge.confidence * 2.2)}
                    strokeDasharray={edge.relationship === 'downstream_risk' ? '4 3' : 'none'}
                    opacity={0.65}
                  />
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {filteredNodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;

              const isSelected = selectedNode?.id === node.id;
              const color = getNodeColor(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => handleNodeClick(node)}
                  className="cursor-pointer group"
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle r={node.type === 'cluster' ? 24 : 18} fill="none" stroke="#0F766E" strokeWidth={2.5} strokeDasharray="3 2" />
                  )}

                  {node.type === 'cluster' ? (
                    <rect
                      x={-14}
                      y={-14}
                      width={28}
                      height={28}
                      rx={6}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                      className="transition-transform group-hover:scale-110 shadow-sm"
                    />
                  ) : node.type === 'infrastructure' ? (
                    <rect
                      x={-10}
                      y={-10}
                      width={20}
                      height={20}
                      transform="rotate(45)"
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                      className="transition-transform group-hover:scale-110 shadow-sm"
                    />
                  ) : (
                    <circle
                      r={12}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                      className="transition-transform group-hover:scale-110 shadow-sm"
                    />
                  )}

                  {/* Label */}
                  <text
                    y={node.type === 'cluster' ? 24 : 20}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-[#374151] select-none pointer-events-none"
                    style={{ textShadow: '0 1px 2px white' }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Node Inspection Slide-over Panel */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-80 bg-white rounded-lg border border-[#E5E7EB] shadow-lg p-4 z-20 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5] mb-2">
              <span className="font-semibold text-sm text-[#111827] truncate">
                {selectedNode.label}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#6C757D]">Topology Type</span>
                <span className="font-medium text-[#111827] uppercase text-[10px] px-1.5 py-0.5 rounded bg-gray-100">
                  {selectedNode.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6C757D]">Sector / Zone</span>
                <span className="font-medium text-[#111827]">{selectedNode.sector || 'Chandigarh'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6C757D]">Priority Index</span>
                <span className="font-bold text-[#0F766E]">{Math.round(selectedNode.priority || 50)}/100</span>
              </div>

              {selectedNode.metadata?.title && (
                <div className="pt-2 border-t border-[#F1F3F5]">
                  <p className="font-semibold text-[#1F2937] text-xs">{selectedNode.metadata.title}</p>
                  <p className="text-[11px] text-[#4B5563] mt-1 line-clamp-3">{selectedNode.metadata.description}</p>
                </div>
              )}

              {selectedNode.metadata?.notes && (
                <div className="pt-2 border-t border-[#F1F3F5]">
                  <p className="font-medium text-[#374151] text-[11px]">Asset Infrastructure Notes:</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{selectedNode.metadata.notes}</p>
                </div>
              )}

              {/* Connected edges for this node */}
              <div className="pt-2 border-t border-[#F1F3F5]">
                <p className="font-semibold text-[#1F2937] text-[11px] mb-1">Topological Relationships:</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {data?.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#F8F9FA] border border-[#E5E7EB] text-[10px]">
                        <div className="flex items-center justify-between font-medium">
                          <span className="capitalize" style={{ color: getEdgeColor(e.relationship) }}>
                            {e.relationship.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500">{Math.round(e.confidence * 100)}% conf</span>
                        </div>
                        <p className="text-gray-600 mt-0.5 text-[10px] leading-snug">{e.explanation}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Network Stats Footer */}
      <div className="p-2.5 bg-[#F8F9FA] border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6C757D]">
        <span>NetworkX Graph: {filteredNodes.length} Nodes • {filteredEdges.length} Active Topological Edges</span>
        <span className="hidden sm:inline">Proximity Threshold: &le; 300m • Jaccard Vocabulary Similarity &ge; 0.20</span>
      </div>
    </div>
  );
};
