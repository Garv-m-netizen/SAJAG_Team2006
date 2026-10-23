import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardHat,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Upload,
  RefreshCw,
  Camera,
  Layers,
  ChevronRight,
  Play,
  Check,
  FileText,
  Navigation,
  ThumbsUp,
  ShieldCheck
} from 'lucide-react';
import { api, mediaUrl } from '../services/api';
import { CameraCapture } from '../components/CameraCapture';
import { IncidentEvidenceGallery } from '../components/IncidentEvidenceGallery';
import { WorkAssignment, Incident } from '../types';
import { useAuth } from '../context/AuthContext';
import { IncidentMap } from '../components/map/IncidentMap';
import { ResolutionProof } from '../components/ResolutionProof';
import { CitizenFeedbackList } from '../components/CitizenFeedbackList';

// Uploads a chosen image to the backend and reports its stored path back to the form field.
const PhotoPicker: React.FC<{ onUploaded: (path: string) => void; preview: string }> = ({ onUploaded, preview }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      onUploaded(await api.uploadResolutionPhoto(file));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <CameraCapture label="Click Photo" disabled={uploading} onCapture={uploadFile} />
      <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[11px] font-semibold text-[#0F766E] hover:bg-teal-50 cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        {uploading ? 'Uploading...' : 'Upload from device'}
        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFile} />
      </label>
      {preview && <img src={mediaUrl(preview)} alt="preview" className="h-9 w-9 rounded object-cover border border-[#E5E7EB]" />}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
};

export const FieldWorkerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<WorkAssignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Proof Submission State
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);

  // Map toggle
  const [viewMode, setViewMode] = useState<'queue' | 'map'>('queue');

  const fetchWorkOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAssignments();
      setAssignments(data);
      // Keep the open work order in sync so its status (and the form) updates after a submit
      setSelectedAssignment((cur) => data.find((a) => a.id === cur?.id) ?? data[0] ?? null);
    } catch (err) {
      console.error("Error fetching worker assignments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [user]);

  const handleStartTask = async (assignment: WorkAssignment) => {
    try {
      const updated = await api.updateAssignmentStatus(assignment.id, {
        status: 'in_progress',
        notes: (assignment.notes || '') + ' [Worker en-route / on-site]'
      });
      setAssignments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, status: 'in_progress' } : a)));
      if (selectedAssignment?.id === assignment.id) {
        setSelectedAssignment((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
      }
    } catch (err: any) {
      alert("Failed to update status: " + (err.response?.data?.detail || err.message));
    }
  };

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
      setBeforePhoto('');
      setAfterPhoto('');
      setResolutionNotes('');
      fetchWorkOrders();
    } catch (err: any) {
      alert("Submission error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProofSubmitted = (a: WorkAssignment) => ['completed', 'resolution_submitted'].includes(a.status);

  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'assigned') return a.status === 'assigned';
    if (filterStatus === 'in_progress') return a.status === 'in_progress';
    if (filterStatus === 'completed') return ['completed', 'resolution_submitted'].includes(a.status);
    return true;
  });

  const pendingCount = assignments.filter((a) => a.status === 'assigned').length;
  const inProgressCount = assignments.filter((a) => a.status === 'in_progress').length;
  const completedCount = assignments.filter((a) => ['completed', 'resolution_submitted'].includes(a.status)).length;

  // Extract incidents from assignments for map
  const assignedIncidents: Incident[] = assignments
    .map((a) => a.incident)
    .filter((inc): inc is Incident => inc !== undefined && inc !== null);

  const getDepartment = () => {
    if (user?.email?.includes('worker1')) {
      return "Sanitation & Drainage Operations Taskforce";
    }
    return "Roadways & Illumination Operations Taskforce";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Field Crew Tactical Duty Header */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/70 text-amber-200 border border-amber-500/30">
            <HardHat className="w-3.5 h-3.5 text-amber-300" />
            Field Operations Duty Board • Chandigarh Municipal Corporation
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Crew: {user?.full_name || 'Field Technician'}
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              ● ON ACTIVE DUTY
            </span>
          </h1>
          <p className="text-xs text-amber-100/90 flex items-center gap-2">
            <span>Unit: <strong>{getDepartment()}</strong></span>
            <span>•</span>
            <span>Assigned Sector Hub: <strong>{user?.sector || 'Chandigarh Central'}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkOrders}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 text-xs flex items-center gap-1.5 transition-colors"
            title="Refresh work orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
          <div className="bg-black/25 px-4 py-2 rounded-lg border border-white/15 text-right">
            <span className="text-[10px] text-amber-200 uppercase font-bold block">Assigned Tasks</span>
            <span className="text-2xl font-black text-white">{assignments.length}</span>
          </div>
        </div>
      </div>

      {/* Operational KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'all' ? 'border-amber-500 bg-amber-50/40 shadow-xs' : 'border-[#E5E7EB] bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Total Assigned</span>
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D20]">{assignments.length}</p>
          <span className="text-[10px] text-gray-500">Active municipal dispatches</span>
        </div>

        <div
          onClick={() => setFilterStatus('assigned')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'assigned' ? 'border-amber-500 bg-amber-50/40 shadow-xs' : 'border-[#E5E7EB] bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Pending Action</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <span className="text-[10px] text-amber-600 font-medium">Ready for dispatch start</span>
        </div>

        <div
          onClick={() => setFilterStatus('in_progress')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'in_progress' ? 'border-blue-500 bg-blue-50/40 shadow-xs' : 'border-[#E5E7EB] bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>In Progress / On-Site</span>
            <Play className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{inProgressCount}</p>
          <span className="text-[10px] text-blue-600 font-medium">Under active remediation</span>
        </div>

        <div
          onClick={() => setFilterStatus('completed')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'completed' ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' : 'border-[#E5E7EB] bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Completed / Proof Sent</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{completedCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Awaiting citizen check</span>
        </div>
      </div>

      {/* View Switcher: Task Queue vs Route Map */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'queue' ? 'bg-[#0F766E] text-white shadow-xs' : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            Duty Task Board & Proof Form
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'map' ? 'bg-[#0F766E] text-white shadow-xs' : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Field Route Map ({assignedIncidents.length} locations)
          </button>
        </div>

        <span className="text-xs text-[#6C757D]">
          Showing: <strong className="text-gray-900">{filteredAssignments.length}</strong> work orders
        </span>
      </div>

      {viewMode === 'map' ? (
        /* Tactical Route GIS Map for Worker */
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1A1D20] flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#0F766E]" />
                Field Route & Assignment Map
              </h2>
              <p className="text-xs text-[#6C757D]">
                Geographic coordinates of your assigned municipal work orders in Chandigarh
              </p>
            </div>
            <span className="text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded font-medium border border-teal-200">
              Sector Routing Navigation
            </span>
          </div>

          <IncidentMap
            incidents={assignedIncidents}
            onSelectIncident={(inc) => {
              const matchingAssign = assignments.find((a) => a.incident_id === inc.id);
              if (matchingAssign) {
                setSelectedAssignment(matchingAssign);
                setViewMode('queue');
              }
            }}
            selectedIncidentId={selectedAssignment?.incident_id}
            height="460px"
          />
        </div>
      ) : (
        /* Tactical Work Orders Queue & Proof Submission Form */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Work Orders Queue (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-bold text-[#1A1D20] flex items-center justify-between">
              <span>Assigned Work Orders</span>
              <span className="text-xs text-gray-500 font-normal">Click to execute proof</span>
            </h2>

            {filteredAssignments.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] text-center space-y-2">
                <HardHat className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500">No work orders match this filter.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredAssignments.map((a) => {
                  const isSelected = selectedAssignment?.id === a.id;
                  const inc = a.incident;
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedAssignment(a);
                        setSubmissionFeedback(null);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all text-xs space-y-2 ${
                        isSelected
                          ? 'border-[#0F766E] bg-teal-50/40 shadow-xs ring-1 ring-[#0F766E]'
                          : 'border-[#E5E7EB] bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          Order #{a.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.priority === 'urgent' || a.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {a.priority} Priority
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      </div>

                      <p className="font-semibold text-gray-900 text-xs">
                        {inc ? inc.title : `Incident #${a.incident_id}`}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {inc?.location.sector || 'Sector'} • {inc?.location.landmark || 'Landmark'}
                        </span>
                        <span>Est: {a.estimated_hours}h</span>
                      </div>

                      {/* Quick Status Action Button */}
                      {a.status === 'assigned' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartTask(a);
                          }}
                          className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Play className="w-3 h-3" /> Start Work / Mark On-Site
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Selected Task Execution & Proof Submission (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedAssignment ? (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-[#F1F3F5]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-500 block">
                      Execution Protocol • Order #{selectedAssignment.id}
                    </span>
                    <h3 className="text-base font-bold text-[#1A1D20]">
                      {selectedAssignment.incident?.title || `Incident #${selectedAssignment.incident_id}`}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Location: <strong>{selectedAssignment.incident?.location.sector}</strong> • Landmark: {selectedAssignment.incident?.location.landmark || 'Identified Landmark'}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    selectedAssignment.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedAssignment.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedAssignment.status}
                  </span>
                </div>

                {/* Supervisor Notes & Incident Details */}
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1.5 border border-gray-200">
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium text-gray-500">Incident Category:</span>
                    <span className="font-semibold capitalize">{selectedAssignment.incident?.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium text-gray-500">Supervisor Instructions:</span>
                    <span className="font-semibold">{selectedAssignment.notes || 'Standard municipal resolution procedure'}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium text-gray-500">Citizen Description:</span>
                    <span className="text-gray-800 italic">"{selectedAssignment.incident?.description || 'No extra notes'}"</span>
                  </div>
                  <IncidentEvidenceGallery evidence={selectedAssignment.incident?.evidence} />
                </div>

                {isProofSubmitted(selectedAssignment) ? (
                  /* Proof already filed: read-only record + citizen feedback, no submit option */
                  <div className="space-y-4 pt-1">
                    <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Proof of resolution submitted</p>
                        <p className="text-[11px] mt-0.5">
                          This work order is closed on your side{selectedAssignment.completed_at
                            ? ` (${new Date(selectedAssignment.completed_at).toLocaleString()})`
                            : ''}. Incident #{selectedAssignment.incident_id} is now with citizens for verification.
                        </p>
                        {submissionFeedback && submissionFeedback.incident_id === selectedAssignment.incident_id && (
                          <p className="text-[11px] mt-1">
                            Automated check: <strong className="uppercase">{submissionFeedback.validation_status}</strong>
                            {submissionFeedback.validation_notes ? ` — ${submissionFeedback.validation_notes}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <ResolutionProof incidentId={selectedAssignment.incident_id} />
                    <CitizenFeedbackList incidentId={selectedAssignment.incident_id} />
                  </div>
                ) : (
                  <form onSubmit={handleWorkerSubmit} className="space-y-4 pt-1">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Camera className="w-4 h-4 text-[#0F766E]" />
                        Submit Proof of Resolution (Before & After)
                      </h4>
                      <span className="text-[10px] text-gray-500">Photographic proof mandatory</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Before Photo URL (Optional):
                      </label>
                      <input
                        type="text"
                        value={beforePhoto}
                        onChange={(e) => setBeforePhoto(e.target.value)}
                        placeholder="https://example.com/before.jpg or upload below"
                        className="w-full p-2.5 border border-[#E5E7EB] rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                      <PhotoPicker onUploaded={setBeforePhoto} preview={beforePhoto} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700">
                          After/Completion Photo URL (Mandatory) *:
                        </label>
                        <button
                          type="button"
                          onClick={() => setAfterPhoto("https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=600")}
                          className="text-[10px] text-[#0F766E] hover:underline font-semibold"
                        >
                          Insert Sample Verified Photo
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={afterPhoto}
                        onChange={(e) => setAfterPhoto(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=600"
                        className="w-full p-2.5 border border-[#E5E7EB] rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                      />
                      <PhotoPicker onUploaded={setAfterPhoto} preview={afterPhoto} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Field Operational Notes (Mandatory) *:
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Specify work details (e.g., cleared 3.5 tons wet silt, patched crater with hot bituminous asphalt, tested illumination)..."
                        className="w-full p-2.5 border border-[#E5E7EB] rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !afterPhoto.trim()}
                      className="w-full py-2.5 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-gray-300 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {isSubmitting ? 'Validating Evidence & Hash Check...' : 'Submit Resolution Proof'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-gray-500 text-xs">
                Select a work order from the queue to start execution or submit proof.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
