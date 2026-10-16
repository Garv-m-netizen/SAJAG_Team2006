import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  HardHat,
  Camera,
  AlertTriangle,
  Upload,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { WorkAssignment, Incident } from '../types';
import { useAuth } from '../context/AuthContext';

export const ResolutionCenter: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [pendingVerificationIncidents, setPendingVerificationIncidents] = useState<Incident[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<WorkAssignment | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);

  // Citizen Reverification Feedback Form
  const [selectedIncidentForFeedback, setSelectedIncidentForFeedback] = useState<Incident | null>(null);
  const [citizenFeedbackType, setCitizenFeedbackType] = useState<string>('confirmed_resolved');
  const [citizenComments, setCitizenComments] = useState<string>('');
  const [feedbackResult, setFeedbackResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [assigns, incs] = await Promise.all([
        api.getAssignments(),
        api.getIncidents({ status: 'awaiting_verification' })
      ]);
      setAssignments(assigns);
      setPendingVerificationIncidents(incs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !afterPhoto.trim()) return;

    setIsSubmitting(true);
    setSubmissionFeedback(null);
    try {
      const result = await api.submitResolution({
        incident_id: selectedAssignment.incident_id,
        assignment_id: selectedAssignment.id,
        before_photo_path: beforePhoto || undefined,
        after_photo_path: afterPhoto,
        resolution_notes: resolutionNotes
      });
      setSubmissionFeedback(result);
      fetchData();
    } catch (err: any) {
      alert("Submission error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCitizenFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentForFeedback) return;

    try {
      const result = await api.submitCitizenFeedback({
        incident_id: selectedIncidentForFeedback.id,
        feedback_type: citizenFeedbackType,
        comments: citizenComments
      });
      setFeedbackResult(result);
      fetchData();
    } catch (err: any) {
      alert("Feedback error: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#0F766E]" />
            Resolution Verification & Community Reverification
          </h1>
          <p className="text-xs text-[#6C757D]">
            Two-sided verification protocol: Field worker proof submission + Citizen confirmation or dispute.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-1.5 rounded border border-[#E5E7EB] text-[#4B5563] hover:bg-gray-50 text-xs flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Work Orders
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: Field Worker Assignments & Proof Submission */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5]">
            <h2 className="text-sm font-semibold text-[#1A1D20] flex items-center gap-1.5">
              <HardHat className="w-4 h-4 text-amber-600" />
              Field Worker Assignments ({assignments.length})
            </h2>
            <span className="text-[11px] text-gray-500 font-mono">Submit Before & After Evidence</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {assignments.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No open work orders assigned.</p>
            ) : (
              assignments.map((as) => (
                <div
                  key={as.id}
                  onClick={() => {
                    setSelectedAssignment(as);
                    setSubmissionFeedback(null);
                  }}
                  className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                    selectedAssignment?.id === as.id
                      ? 'border-[#0F766E] bg-teal-50/40'
                      : 'border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-900 font-mono">Work Order #{as.id}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.2 rounded font-bold bg-gray-100 text-gray-700">
                      {as.status}
                    </span>
                  </div>
                  <p className="text-[#374151] font-medium mt-1">Incident Ref: #{as.incident_id}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-1">{as.notes || 'Routine municipal dispatch'}</p>
                </div>
              ))
            )}
          </div>

          {/* Evidence Submission Form */}
          {selectedAssignment && (
            <form onSubmit={handleWorkerSubmit} className="pt-3 border-t border-[#F1F3F5] space-y-3 text-xs">
              <span className="font-semibold text-gray-800 block">
                Submit Resolution Proof for Order #{selectedAssignment.id}:
              </span>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Before Photo URL (Optional):</label>
                <input
                  type="text"
                  value={beforePhoto}
                  onChange={(e) => setBeforePhoto(e.target.value)}
                  placeholder="https://example.com/before.jpg"
                  className="w-full p-2 border border-[#E5E7EB] rounded text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">After/Completion Photo URL (Mandatory) *:</label>
                <input
                  type="text"
                  required
                  value={afterPhoto}
                  onChange={(e) => setAfterPhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=600"
                  className="w-full p-2 border border-[#E5E7EB] rounded text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAfterPhoto("https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=600")}
                  className="text-[10px] text-[#0F766E] hover:underline mt-0.5 block"
                >
                  Insert Sample Verified Photo
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Operational Resolution Notes *:</label>
                <textarea
                  required
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe actions taken (e.g., cleared 4 tons silt, patched with hot mix asphalt, replaced 90W LED drivers)..."
                  className="w-full p-2 border border-[#E5E7EB] rounded text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !afterPhoto.trim()}
                className="w-full py-2 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-gray-300 text-white font-medium rounded text-xs flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                {isSubmitting ? 'Verifying Proof...' : 'Submit Resolution Proof'}
              </button>

              {submissionFeedback && (
                <div className={`p-2.5 rounded text-xs ${
                  submissionFeedback.validation_status === 'valid'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}>
                  <strong>Verification Status: {submissionFeedback.validation_status.toUpperCase()}</strong>
                  <p className="text-[11px] mt-0.5">{submissionFeedback.validation_notes}</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* SECTION 2: Community Reverification for Citizens */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5]">
            <h2 className="text-sm font-semibold text-[#1A1D20] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Community Reverification ({pendingVerificationIncidents.length})
            </h2>
            <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold">
              Earn +3 Points Per Check
            </span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Citizens can confirm or dispute whether municipal repairs actually resolved the problem. Conflicting feedback alerts supervisors.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pendingVerificationIncidents.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No resolutions awaiting verification.</p>
            ) : (
              pendingVerificationIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncidentForFeedback(inc);
                    setFeedbackResult(null);
                  }}
                  className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                    selectedIncidentForFeedback?.id === inc.id
                      ? 'border-[#0F766E] bg-teal-50/40'
                      : 'border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>#{inc.incident_number}</span>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                      AWAITING VERIFY
                    </span>
                  </div>
                  <p className="font-medium text-[#374151] mt-0.5">{inc.title}</p>
                  <span className="text-[11px] text-gray-500">{inc.location.sector} • {inc.location.landmark}</span>
                </div>
              ))
            )}
          </div>

          {/* Citizen Feedback Action */}
          {selectedIncidentForFeedback && (
            <form onSubmit={handleCitizenFeedbackSubmit} className="pt-3 border-t border-[#F1F3F5] space-y-3 text-xs">
              <span className="font-semibold text-gray-800 block">
                Reverify Resolution for #{selectedIncidentForFeedback.incident_number}:
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCitizenFeedbackType('confirmed_resolved')}
                  className={`p-2 rounded border text-center transition-all ${
                    citizenFeedbackType === 'confirmed_resolved'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-[#E5E7EB] hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-600" />
                  Confirmed Resolved
                </button>

                <button
                  type="button"
                  onClick={() => setCitizenFeedbackType('problem_still_exists')}
                  className={`p-2 rounded border text-center transition-all ${
                    citizenFeedbackType === 'problem_still_exists'
                      ? 'border-red-500 bg-red-50 text-red-800 font-bold'
                      : 'border-[#E5E7EB] hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5 mx-auto mb-1 text-red-600" />
                  Problem Still Exists
                </button>

                <button
                  type="button"
                  onClick={() => setCitizenFeedbackType('unable_to_verify')}
                  className={`p-2 rounded border text-center transition-all ${
                    citizenFeedbackType === 'unable_to_verify'
                      ? 'border-gray-500 bg-gray-100 text-gray-800 font-bold'
                      : 'border-[#E5E7EB] hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 mx-auto mb-1 text-gray-500" />
                  Unable to Verify
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Notes / Field Feedback:</label>
                <input
                  type="text"
                  value={citizenComments}
                  onChange={(e) => setCitizenComments(e.target.value)}
                  placeholder="E.g., Inspected spot this morning, water drained completely..."
                  className="w-full p-2 border border-[#E5E7EB] rounded text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#0F766E] hover:bg-[#0D9488] text-white font-medium rounded text-xs flex items-center justify-center gap-1.5"
              >
                Submit Citizen Reverification (+3 Points)
              </button>

              {feedbackResult && (
                <div className="p-2.5 rounded bg-teal-50 border border-teal-200 text-teal-900 text-xs">
                  <strong>Outcome:</strong> {feedbackResult.message}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
