import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Layers,
  ArrowRight,
  TrendingUp,
  MapPin,
  ShieldAlert,
  PlusCircle,
  Sliders,
  Network
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';
import { IncidentMap } from '../components/map/IncidentMap';
import { useAuth } from '../context/AuthContext';

export const Overview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({
    open_incidents: 0,
    high_priority_incidents: 0,
    recurring_clusters: 0,
    pending_assignments: 0,
    awaiting_verification: 0,
    recently_resolved: 0,
    critical_hazards: 0
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, incList] = await Promise.all([
          api.getDashboardStats(),
          api.getIncidents({ limit: 40 })
        ]);
        setStats(statsData);
        setIncidents(incList);
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const highPriorityList = incidents.filter(
    (i) => (i.priority_override ?? i.priority_score) >= 70 || i.urgency === 'critical'
  ).slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Action Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] tracking-tight">
            Chandigarh Civic Operations Command
          </h1>
          <p className="text-xs text-[#6C757D] mt-0.5">
            Connected civic intelligence, predictive action, proof of resolution, and citizen participation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/report')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-medium rounded-md shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Report Civic Issue
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/intervention')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E5E7EB] text-[#374151] text-xs font-medium rounded-md shadow-xs transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
              Intervention Simulator
            </button>
          )}
          <button
            onClick={() => navigate('/graph')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E5E7EB] text-[#374151] text-xs font-medium rounded-md shadow-xs transition-colors"
          >
            <Network className="w-3.5 h-3.5 text-[#0F766E]" />
            Incident Graph
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (Calculated directly from Database) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Open Incidents</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D20]">{stats.open_incidents}</p>
          <span className="text-[10px] text-gray-500">Across 8 sectors</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-red-200 bg-red-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-red-700 mb-1">
            <span>High Priority</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.high_priority_incidents}</p>
          <span className="text-[10px] text-red-600 font-medium">Priority Score &ge; 75</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Chronic Clusters</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D20]">{stats.recurring_clusters}</p>
          <span className="text-[10px] text-purple-700 font-medium">Recurring hotspots</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Active Crews</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D20]">{stats.pending_assignments}</p>
          <span className="text-[10px] text-gray-500">Dispatched work orders</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span>Awaiting Verify</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800">{stats.awaiting_verification}</p>
          <span className="text-[10px] text-amber-700 font-medium">Community feedback</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
            <span>Verified Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{stats.recently_resolved}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Citizen confirmed</span>
        </div>
      </div>

      {/* Main Grid: Interactive Incident Map + High Priority Triage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map Card */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1D20]">Chandigarh Civic Incident Map</h2>
              <p className="text-xs text-[#6C757D]">Live spatial distribution with priority score pins</p>
            </div>
            <span className="text-[11px] text-[#6C757D] bg-gray-100 px-2 py-0.5 rounded font-mono">
              {incidents.length} Mapped Incidents
            </span>
          </div>

          <div className="flex-1 min-h-[380px]">
            <IncidentMap
              incidents={incidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              selectedIncidentId={selectedIncident?.id}
              height="380px"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#6C757D] pt-2 border-t border-[#F1F3F5]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Priority &ge; 75 (Urgent)
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span> Priority 55-74
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ml-2"></span> Standard
            </span>
            <button
              onClick={() => navigate('/graph')}
              className="text-[#0F766E] hover:underline flex items-center gap-1 font-medium"
            >
              View Incident Graph <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Priority Triage Column */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F3F5]">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1D20]">High Priority Triage</h2>
              <p className="text-xs text-[#6C757D]">Requiring immediate operational response</p>
            </div>
            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              {highPriorityList.length} Critical
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {highPriorityList.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No critical incidents open.</p>
            ) : (
              highPriorityList.map((inc) => {
                const effPriority = inc.priority_override ?? inc.priority_score;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3 rounded-md border transition-all cursor-pointer text-xs ${
                      selectedIncident?.id === inc.id
                        ? 'border-[#0F766E] bg-teal-50/30'
                        : 'border-[#E5E7EB] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#1A1D20]">#{inc.incident_number}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                        Score: {Math.round(effPriority)}
                      </span>
                    </div>

                    <p className="font-medium text-[#374151] line-clamp-1 mb-1">{inc.title}</p>

                    <div className="flex items-center justify-between text-[11px] text-[#6C757D]">
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {inc.location.sector}
                      </span>
                      <span className="capitalize px-1.5 py-0.2 rounded bg-gray-100 font-medium text-[10px]">
                        {inc.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedIncident && (
            <div className="mt-3 p-2.5 rounded bg-teal-50/60 border border-teal-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-teal-900">Selected Incident Details</span>
                <span className="text-[10px] text-teal-700 uppercase font-bold">{selectedIncident.status}</span>
              </div>
              <p className="text-[11px] text-teal-800 line-clamp-2">{selectedIncident.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-teal-700">Recurrence: {selectedIncident.recurrence_count}x</span>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-[11px] font-semibold text-teal-800 hover:underline"
                  >
                    Assign / Override &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Row: Active Recurring Clusters & Recent Resolutions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recurring Clusters Card */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F3F5]">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1D20]">Active Recurring Clusters</h2>
              <p className="text-xs text-[#6C757D]">Hotspots detected by Civic Incident Graph topology</p>
            </div>
            <span className="text-xs text-[#0F766E] font-medium cursor-pointer hover:underline" onClick={() => navigate('/graph')}>
              Inspect Graph
            </span>
          </div>

          <div className="space-y-2">
            <div className="p-3 rounded-md bg-[#FFFBEB] border border-amber-200 text-xs">
              <div className="flex items-center justify-between font-semibold text-amber-900">
                <span>Sector 22 Aroma Market Recurring Waste Ingress</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">3 Reports</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Proximity cluster in Sector 22 commercial belt. Desilting lasts only 4-6 days due to upstream food kiosk refuse. Grease trap installation recommended.
              </p>
            </div>

            <div className="p-3 rounded-md bg-[#FFFBEB] border border-amber-200 text-xs">
              <div className="flex items-center justify-between font-semibold text-amber-900">
                <span>Sector 26 Wholesale Market Drainage Overflow</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">4 Reports</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Stormwater culvert outfall continually clogged by vegetable wholesale crates. Threatens sub-base stability along Madhya Marg.
              </p>
            </div>
          </div>
        </div>

        {/* Community Verification & Resolutions Card */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F3F5]">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1D20]">Proof of Resolution & Reverification</h2>
              <p className="text-xs text-[#6C757D]">Field work submissions awaiting or verified by citizens</p>
            </div>
            <span className="text-xs text-[#0F766E] font-medium cursor-pointer hover:underline" onClick={() => navigate('/resolution')}>
              Resolution Center
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded border border-[#E5E7EB] bg-gray-50 flex items-start justify-between">
              <div>
                <span className="font-semibold text-[#1F2937]">#CP-2610-0104 • Sector 26 Grain Market</span>
                <p className="text-[11px] text-[#4B5563] mt-0.5">
                  Worker Vikram Singh uploaded before/after evidence for culvert jetting.
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                  Awaiting Citizen Confirmation
                </span>
              </div>
              <button
                onClick={() => navigate('/resolution')}
                className="text-[11px] text-[#0F766E] font-semibold hover:underline flex-shrink-0"
              >
                Reverify &rarr;
              </button>
            </div>

            <div className="p-2.5 rounded border border-emerald-200 bg-emerald-50/40 flex items-start justify-between">
              <div>
                <span className="font-semibold text-emerald-950">#CP-2610-0105 • Sector 17 Central Plaza</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  5 LED streetlights replaced. Citizen Simran Kaur confirmed 100% illumination.
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-200 px-1.5 py-0.2 rounded">
                  Citizen Confirmed (+18 pts awarded)
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
