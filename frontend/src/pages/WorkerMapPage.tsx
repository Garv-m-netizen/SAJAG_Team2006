import React, { useEffect, useState } from 'react';
import {
  Navigation,
  HardHat,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentEvidenceGallery } from '../components/IncidentEvidenceGallery';
import { WorkAssignment, Incident } from '../types';
import { IncidentMap } from '../components/map/IncidentMap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const WorkerMapPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAssignments();
      setAssignments(data);
      if (data.length > 0 && data[0].incident) {
        setSelectedIncident(data[0].incident);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const assignedIncidents: Incident[] = assignments
    .map((a) => a.incident)
    .filter((inc): inc is Incident => inc !== undefined && inc !== null);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-600" />
            Field Crew Task Route & Sector Map
          </h1>
          <p className="text-xs text-[#6C757D]">
            Geographic coordinates and locations for work orders assigned to {user?.full_name}.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="p-1.5 rounded border border-[#E5E7EB] text-[#4B5563] hover:bg-gray-50 text-xs flex items-center gap-1 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Route
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-2xs">
          <IncidentMap
            incidents={assignedIncidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            selectedIncidentId={selectedIncident?.id}
            height="500px"
          />
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs space-y-1.5">
            <span className="font-bold text-amber-900 block flex items-center gap-1.5">
              <HardHat className="w-4 h-4 text-amber-700" />
              Route Summary • {assignedIncidents.length} Assigned Sites
            </span>
            <p className="text-amber-800">
              Click any pin on the map or select an order below to view the site landmark and citizen issue description.
            </p>
          </div>

          {selectedIncident ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3">
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block">
                Selected Work Order Pin
              </span>
              <h3 className="text-sm font-bold text-gray-900">{selectedIncident.title}</h3>

              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 text-gray-600 border border-gray-100">
                <div className="flex justify-between">
                  <span>Sector:</span>
                  <strong className="text-gray-900">{selectedIncident.location.sector}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Landmark:</span>
                  <strong className="text-gray-900">{selectedIncident.location.landmark || 'Identified Landmark'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Priority:</span>
                  <strong className="text-teal-800">{Math.round(selectedIncident.priority_override ?? selectedIncident.priority_score)}/100</strong>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-700 block">Citizen Description:</span>
                <p className="text-xs text-gray-700 italic">"{selectedIncident.description}"</p>
              </div>

              <IncidentEvidenceGallery evidence={selectedIncident.evidence} size="sm" />

              <button
                onClick={() => navigate('/worker-tasks')}
                className="w-full py-2 bg-[#0F766E] hover:bg-[#0D9488] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Go to Execution & Submit Proof
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-xs text-gray-500">
              Select a pin to inspect assignment details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
