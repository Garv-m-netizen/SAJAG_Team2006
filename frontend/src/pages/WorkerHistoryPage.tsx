import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  HardHat,
  Calendar,
  Clock,
  ThumbsUp,
  MapPin,
  RefreshCw,
  Camera,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { WorkAssignment } from '../types';
import { useAuth } from '../context/AuthContext';
import { ResolutionProof } from '../components/ResolutionProof';
import { CitizenFeedbackList } from '../components/CitizenFeedbackList';

export const WorkerHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [completedAssignments, setCompletedAssignments] = useState<WorkAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAssignments();
      const completed = data.filter((a) => ['completed', 'resolution_submitted'].includes(a.status));
      setCompletedAssignments(completed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Completed Work Orders & Resolution History
          </h1>
          <p className="text-xs text-[#6C757D]">
            Review your past submitted field repairs, proof photos, and community verification feedback.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="p-1.5 rounded border border-[#E5E7EB] text-[#4B5563] hover:bg-gray-50 text-xs flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading work history...</div>
      ) : completedAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center space-y-3">
          <HardHat className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-800">No Completed Work Orders Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Once you submit photographic resolution proof for assigned municipal tasks, your verification record will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedAssignments.map((a) => {
            const inc = a.incident;
            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3 hover:border-gray-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-gray-900">Work Order #{a.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Proof Submitted
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900">
                  {inc?.title || `Incident Ref #${a.incident_id}`}
                </h3>

                <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 text-gray-600 border border-gray-100">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <strong className="text-gray-900">{inc?.location.sector} • {inc?.location.landmark}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Time:</span>
                    <span>{new Date(a.assigned_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Field Effort:</span>
                    <span>{a.estimated_hours} crew hours</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-700 block">Supervisor Notes:</span>
                  <p className="text-xs text-gray-700 italic">{a.notes || 'Routine municipal dispatch'}</p>
                </div>

                <ResolutionProof incidentId={a.incident_id} />
                <CitizenFeedbackList incidentId={a.incident_id} />

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-teal-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Automated Image & Hash Validated
                  </span>
                  <span className="text-gray-500 font-mono">
                    Incident #{a.incident_id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
