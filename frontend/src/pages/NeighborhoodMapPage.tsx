import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Filter,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { api, mediaUrl } from '../services/api';
import { Incident } from '../types';
import { IncidentMap } from '../components/map/IncidentMap';
import { useAuth } from '../context/AuthContext';
import { useReverifiedIds } from '../hooks/useReverifiedIds';

export const NeighborhoodMapPage: React.FC = () => {
  const { user } = useAuth();
  const reverifiedIds = useReverifiedIds();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getIncidents({ limit: 60 });
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filteredIncidents = incidents.filter((i) => {
    if (sectorFilter !== 'all' && i.location.sector !== sectorFilter) return false;
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    if (statusFilter === 'open' && ['resolved', 'rejected'].includes(i.status)) return false;
    if (statusFilter === 'resolved' && i.status !== 'resolved') return false;
    return true;
  });

  const uniqueSectors = Array.from(new Set(incidents.map((i) => i.location.sector))).filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0F766E]" />
            Chandigarh Neighborhood Civic Map
          </h1>
          <p className="text-xs text-[#6C757D]">
            Explore civic issues, verified fixes, and active remediation across Chandigarh sectors.
          </p>
        </div>

        <button
          onClick={() => navigate('/report')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Report Issue Here
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="p-1.5 border border-[#E5E7EB] rounded-md text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Sectors ({incidents.length})</option>
            {uniqueSectors.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-1.5 border border-[#E5E7EB] rounded-md text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Categories</option>
            <option value="drainage_waterlogging">Drainage & Waterlogging</option>
            <option value="garbage_sanitation">Garbage & Sanitation</option>
            <option value="potholes_roads">Potholes & Roads</option>
            <option value="broken_streetlights">Streetlights & Power</option>
            <option value="water_supply">Water Supply</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 border border-[#E5E7EB] rounded-md text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Active / Unresolved</option>
            <option value="resolved">Verified Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>Pins: <strong className="text-red-600">● Red &ge;75</strong> • <strong className="text-amber-600">● Amber &ge;55</strong> • <strong className="text-teal-700">● Teal Normal</strong></span>
        </div>
      </div>

      {/* Map & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-2xs">
          <IncidentMap
            incidents={filteredIncidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            selectedIncidentId={selectedIncident?.id}
            height="520px"
          />
        </div>

        <div className="lg:col-span-4 space-y-4">
          {selectedIncident ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-gray-900">#{selectedIncident.incident_number}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedIncident.status === 'resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedIncident.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#1A1D20]">
                {selectedIncident.title}
              </h3>

              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1.5 border border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Sector:</span>
                  <span className="font-semibold text-gray-900">{selectedIncident.location.sector}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Landmark:</span>
                  <span className="font-semibold text-gray-900">{selectedIncident.location.landmark || 'Identified Landmark'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Category:</span>
                  <span className="font-semibold capitalize text-gray-900">{selectedIncident.category.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Priority Rating:</span>
                  <span className="font-bold text-teal-800">{Math.round(selectedIncident.priority_override ?? selectedIncident.priority_score)}/100</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">Description:</span>
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  "{selectedIncident.description}"
                </p>
              </div>

              {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-bold text-gray-700 block mb-1">Attached Evidence:</span>
                  {selectedIncident.evidence.map((ev) =>
                    ev.file_type.startsWith('audio') ? (
                      <audio key={ev.id} controls src={mediaUrl(ev.file_path)} className="w-full h-9 mb-1" />
                    ) : (
                      <img
                        key={ev.id}
                        src={mediaUrl(ev.file_path)}
                        alt="Evidence"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 mb-1"
                      />
                    )
                  )}
                </div>
              )}

              {selectedIncident.status === 'awaiting_verification' && !reverifiedIds.includes(selectedIncident.id) && (
                <button
                  onClick={() => navigate('/verify')}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Verify This Repair (+3 pts)
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-xs text-gray-500">
              Click any pin on the map to inspect incident details and neighborhood status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
