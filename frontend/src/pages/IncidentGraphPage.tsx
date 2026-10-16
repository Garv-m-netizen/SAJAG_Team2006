import React, { useEffect, useState } from 'react';
import {
  Network,
  RefreshCw,
  Layers,
  MapPin,
  HelpCircle,
  Shield,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { GraphData, GraphNode } from '../types';
import { IncidentGraphCanvas } from '../components/graph/IncidentGraphCanvas';

export const IncidentGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchGraph = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGraphTopology({
        sector: selectedSector,
        category: selectedCategory,
        status: selectedStatus
      });
      setGraphData(data);
    } catch (err) {
      console.error("Error loading graph topology:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [selectedSector, selectedCategory, selectedStatus]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <Network className="w-5 h-5 text-[#0F766E]" />
            Civic Incident Graph
          </h1>
          <p className="text-xs text-[#6C757D]">
            Real-time NetworkX graph intelligence discovering recurring hotspots, duplicate submissions, and infrastructure linkages.
          </p>
        </div>

        <button
          onClick={fetchGraph}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] text-xs font-medium text-[#374151] rounded-md hover:bg-gray-50 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0F766E] ${isLoading ? 'animate-spin' : ''}`} />
          Recalculate Topology
        </button>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs flex flex-wrap items-center gap-4 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Filter by Sector:</label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="p-1.5 border border-[#E5E7EB] rounded bg-white text-xs text-gray-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Chandigarh Sectors</option>
            <option value="Sector 17">Sector 17</option>
            <option value="Sector 22">Sector 22</option>
            <option value="Sector 26">Sector 26</option>
            <option value="Sector 35">Sector 35</option>
            <option value="Sector 43">Sector 43</option>
            <option value="Manimajra">Manimajra</option>
            <option value="Industrial Area Phase 1">Industrial Area Phase 1</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Filter by Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 border border-[#E5E7EB] rounded bg-white text-xs text-gray-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Categories</option>
            <option value="drainage_waterlogging">Drainage & Waterlogging</option>
            <option value="garbage_sanitation">Garbage & Sanitation</option>
            <option value="potholes_roads">Potholes & Roads</option>
            <option value="broken_streetlights">Broken Streetlights</option>
            <option value="water_supply">Water Supply</option>
            <option value="infrastructure_damage">Infrastructure</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Filter by Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-1.5 border border-[#E5E7EB] rounded bg-white text-xs text-gray-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Lifecycle States</option>
            <option value="reported">Reported</option>
            <option value="under_review">Under Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_verification">Awaiting Verification</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Interactive Graph Canvas */}
      <IncidentGraphCanvas
        data={graphData}
        isLoading={isLoading}
      />

      {/* Topology Relationship Logic Explained */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-900 pb-1 border-b border-amber-100">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Recurring Pattern Engine
          </div>
          <p className="text-[#4B5563] text-[11px] leading-relaxed">
            Identifies repeat complaints within 300 meters having &ge; 20% vocabulary token similarity. Recommends clustering to avoid redundant single-ticket dispatches.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-purple-900 pb-1 border-b border-purple-100">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            Downstream Cascading Risks
          </div>
          <p className="text-[#4B5563] text-[11px] leading-relaxed">
            Correlates upstream drainage and sanitation obstructions to vulnerable underpasses, flood culverts, and transit roundabouts.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-teal-900 pb-1 border-b border-teal-100">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
            Infrastructure Adjacency
          </div>
          <p className="text-[#4B5563] text-[11px] leading-relaxed">
            Calculates Euclidean & Haversine proximity (&le; 450m) from municipal assets (transformers, water mains, bridges) to assess asset integrity.
          </p>
        </div>
      </div>
    </div>
  );
};
