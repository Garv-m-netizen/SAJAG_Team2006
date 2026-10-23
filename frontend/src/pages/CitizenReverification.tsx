import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Clock,
  MapPin,
  RefreshCw,
  Camera,
  Award,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';
import { useAuth } from '../context/AuthContext';
import { ResolutionProof } from '../components/ResolutionProof';

export const CitizenReverification: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [feedbackType, setFeedbackType] = useState<string>('confirmed_resolved');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackResult, setFeedbackResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Incidents this citizen has already reverified (loaded from the server); hidden so the form can't be submitted twice
  const [doneIds, setDoneIds] = useState<number[]>([]);

  const fetchPendingIncidents = async () => {
    setIsLoading(true);
    try {
      const [all, reverified] = await Promise.all([
        api.getIncidents({ status: 'awaiting_verification' }),
        api.getMyReverifiedIds().catch(() => [] as number[]),
      ]);
      setDoneIds((ids) => Array.from(new Set([...ids, ...reverified])));
      const data = all.filter((i) => !doneIds.includes(i.id) && !reverified.includes(i.id));
      setIncidents(data);
      setSelectedIncident((cur) => (cur && data.some((i) => i.id === cur.id) ? cur : data[0] ?? null));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingIncidents();
  }, [user]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await api.submitCitizenFeedback({
        incident_id: selectedIncident.id,
        feedback_type: feedbackType,
        comments: comments || undefined
      });
      const remaining = incidents.filter((i) => i.id !== selectedIncident.id);
      setDoneIds((ids) => [...ids, selectedIncident.id]);
      setIncidents(remaining);
      setSelectedIncident(remaining[0] ?? null);
      setFeedbackResult({ ...result, incident_number: selectedIncident.incident_number });
      setComments('');
      setFeedbackType('confirmed_resolved');
    } catch (err: any) {
      alert("Feedback submission failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950/60 text-teal-200 border border-teal-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            Citizen Oversight Protocol • Sector Accountability
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Community Reverification
          </h1>
          <p className="text-xs text-teal-100/90 mt-1 max-w-xl">
            In Chandigarh's two-sided verified resolution system, no municipal ticket is closed by workers alone. Citizens inspect before/after photographic proof and confirm or dispute repairs.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 text-right flex-shrink-0">
          <span className="text-[10px] uppercase font-bold text-teal-200 block">Review Incentive</span>
          <div className="text-xl font-bold text-amber-300 flex items-center justify-end gap-1">
            <Award className="w-4 h-4" />
            +3 Points / Check
          </div>
          <span className="text-[10px] text-teal-100">Directly credits your civic ledger</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending Issues List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-[#1A1D20] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Repairs Awaiting Verification ({incidents.length})
            </h2>
            <button
              onClick={fetchPendingIncidents}
              className="text-xs text-gray-500 hover:text-gray-800 p-1 rounded"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 bg-white rounded-xl border border-[#E5E7EB] text-center text-xs text-gray-500">
              Loading verification queue...
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-[#E5E7EB] text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-gray-900">All Cleared!</p>
              <p className="text-[11px] text-gray-500">
                There are no open repairs in Chandigarh waiting for citizen verification right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncident(inc);
                      setFeedbackResult(null);
                    }}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'border-[#0F766E] bg-teal-50/40 shadow-xs ring-1 ring-[#0F766E]'
                        : 'border-[#E5E7EB] bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-gray-900">#{inc.incident_number}</span>
                      <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-1.5 py-0.2 rounded">
                        REPAIRED
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-xs line-clamp-1">{inc.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {inc.location.sector} • {inc.location.landmark}
                      </span>
                      <span className="capitalize">{inc.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Incident Evidence & Verification Voting (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {feedbackResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 space-y-1">
              <div className="flex items-center justify-between gap-2 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Reverification for #{feedbackResult.incident_number} submitted!
                </span>
                <button
                  type="button"
                  onClick={() => setFeedbackResult(null)}
                  className="text-emerald-700 hover:underline font-normal text-[11px]"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-[11px]">{feedbackResult.message}</p>
              <p className="text-[10px] text-emerald-700 font-semibold">
                +3 Points awarded to your citizen ledger. Thank you for keeping Chandigarh civic infrastructure accountable!
              </p>
            </div>
          )}
          {selectedIncident ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-5">
              <div className="flex items-start justify-between pb-3 border-b border-[#F1F3F5]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-gray-500 block">
                    Verification Ref • #{selectedIncident.incident_number}
                  </span>
                  <h3 className="text-base font-bold text-[#1A1D20]">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {selectedIncident.location.sector} • {selectedIncident.location.landmark || 'Identified Landmark'}
                  </p>
                </div>

                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  Earn +3 Pts
                </span>
              </div>

              {/* Citizen Original Problem Details */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                <span className="font-semibold text-gray-700 block">Original Citizen Complaint:</span>
                <p className="text-gray-800 italic">"{selectedIncident.description}"</p>
              </div>

              {/* Field Evidence Inspection Area */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                  Field Worker Proof of Resolution (Before & After)
                </span>

                <ResolutionProof incidentId={selectedIncident.id} />
              </div>

              {/* Citizen Voting Form */}
              <form onSubmit={handleFeedbackSubmit} className="pt-2 border-t border-gray-100 space-y-4">
                <span className="text-xs font-bold text-gray-900 block">
                  How does the repaired location look to you?
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFeedbackType('confirmed_resolved')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      feedbackType === 'confirmed_resolved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                        : 'border-[#E5E7EB] hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs block">Confirmed Resolved</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Properly fixed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackType('problem_still_exists')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      feedbackType === 'problem_still_exists'
                        ? 'border-red-500 bg-red-50 text-red-900 font-bold ring-1 ring-red-500'
                        : 'border-[#E5E7EB] hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <ThumbsDown className="w-5 h-5 mx-auto mb-1 text-red-600" />
                    <span className="text-xs block">Problem Still Exists</span>
                    <span className="text-[10px] text-red-700 font-normal">Reopen complaint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackType('unable_to_verify')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      feedbackType === 'unable_to_verify'
                        ? 'border-gray-500 bg-gray-100 text-gray-900 font-bold ring-1 ring-gray-400'
                        : 'border-[#E5E7EB] hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <HelpCircle className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                    <span className="text-xs block">Unable to Verify</span>
                    <span className="text-[10px] text-gray-500 font-normal">Pass to another</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Citizen Field Feedback Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="E.g., Inspected on my morning walk: road surface smooth and dry..."
                    className="w-full p-2.5 border border-[#E5E7EB] rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#0F766E] hover:bg-[#0D9488] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSubmitting ? 'Recording Verification...' : 'Submit Citizen Reverification (+3 Points)'}
                </button>

              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-xs text-gray-500">
              {doneIds.length > 0
                ? 'All caught up! No more resolutions are waiting for your verification.'
                : 'Select an incident from the verification queue to inspect photographic proof and submit citizen feedback.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
