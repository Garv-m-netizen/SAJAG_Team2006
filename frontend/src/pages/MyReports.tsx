import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api, mediaUrl } from '../services/api';
import { Incident } from '../types';
import { useAuth } from '../context/AuthContext';
import { useReverifiedIds } from '../hooks/useReverifiedIds';

export const MyReports: React.FC = () => {
  const { user } = useAuth();
  const reverifiedIds = useReverifiedIds();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyIncidents();
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">RESOLVED</span>;
      case 'awaiting_verification':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse">AWAITING VERIFICATION</span>;
      case 'assigned':
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">IN PROGRESS</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800">UNDER REVIEW</span>;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20]">My Submitted Reports</h1>
          <p className="text-xs text-[#6C757D]">
            Track the end-to-end lifecycle, priority assessments, and community reverification triggers.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="p-1.5 rounded border border-[#E5E7EB] text-[#4B5563] hover:bg-gray-50 text-xs flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading your complaint trajectory...</div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-900">No Complaints Submitted Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            You haven't reported any civic problems yet. Submit an issue in your neighborhood to earn civic points!
          </p>
          <button
            onClick={() => navigate('/report')}
            className="px-4 py-2 bg-[#0F766E] text-white text-xs font-medium rounded-md hover:bg-[#0D9488]"
          >
            Report an Issue Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => {
            const effPriority = inc.priority_override ?? inc.priority_score;
            return (
              <div
                key={inc.id}
                className="bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-2xs hover:border-gray-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#F1F3F5]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#1A1D20]">
                      #{inc.incident_number}
                    </span>
                    {getStatusBadge(inc.status)}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">
                      {inc.category.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#6C757D]">
                    <span>Priority Score: <strong className="text-red-700">{Math.round(effPriority)}/100</strong></span>
                    <span>•</span>
                    <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-[#1F2937]">{inc.title}</h3>
                  <p className="text-xs text-[#4B5563] mt-1">{inc.description}</p>
                  {inc.evidence?.some((ev) => ev.file_type.startsWith('image')) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {inc.evidence.filter((ev) => ev.file_type.startsWith('image')).map((ev) => (
                        <a key={ev.id} href={mediaUrl(ev.file_path)} target="_blank" rel="noreferrer">
                          <img
                            src={mediaUrl(ev.file_path)}
                            alt="Issue photo"
                            className="w-16 h-16 object-cover rounded-md border border-[#E5E7EB]"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#6C757D] border-t border-[#F1F3F5]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>{inc.location.sector} • {inc.location.landmark || 'GPS Pin'}</span>
                  </div>

                  {inc.status === 'awaiting_verification' && !reverifiedIds.includes(inc.id) && (
                    <button
                      onClick={() => navigate('/resolution')}
                      className="px-3 py-1 bg-[#D97706] hover:bg-[#B45309] text-white font-medium rounded text-xs shadow-2xs flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify Field Resolution &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
