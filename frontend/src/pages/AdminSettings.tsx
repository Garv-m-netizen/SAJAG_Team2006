import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  Clock,
  HardHat,
  Search,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';

export const AdminSettings: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [overrideScore, setOverrideScore] = useState<number>(85.0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isOverriding, setIsOverriding] = useState<boolean>(false);

  // Worker assignment
  const [selectedWorkerId, setSelectedWorkerId] = useState<number>(2); // Vikram Singh
  const [assignmentPriority, setAssignmentPriority] = useState<string>('high');
  const [assignmentHours, setAssignmentHours] = useState<number>(4.0);
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Seed Reset
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string>('');

  const fetchData = async () => {
    try {
      const [incList, logs] = await Promise.all([
        api.getIncidents({ limit: 50 }),
        api.getAuditLogs(30)
      ]);
      setIncidents(incList);
      setAuditLogs(logs);
      if (incList.length > 0 && !selectedIncident) {
        setSelectedIncident(incList[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePriorityOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !overrideReason.trim()) return;

    setIsOverriding(true);
    try {
      const updated = await api.overridePriority(selectedIncident.id, {
        priority_override: overrideScore,
        override_reason: overrideReason
      });
      setSelectedIncident(updated);
      setOverrideReason('');
      fetchData();
      alert(`Priority for #${updated.incident_number} successfully overridden to ${overrideScore}/100.`);
    } catch (err: any) {
      alert("Override failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsOverriding(false);
    }
  };

  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setIsAssigning(true);
    try {
      await api.assignWork({
        incident_id: selectedIncident.id,
        worker_id: selectedWorkerId,
        priority: assignmentPriority,
        estimated_hours: assignmentHours,
        notes: assignmentNotes || 'Supervisory municipal dispatch order'
      });
      setAssignmentNotes('');
      fetchData();
      alert(`Incident #${selectedIncident.incident_number} assigned successfully.`);
    } catch (err: any) {
      alert("Assignment failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResetSeed = async () => {
    if (!confirm("Reset database to clean Chandigarh demonstration baseline? All synthetic records will be re-seeded.")) return;

    setIsResetting(true);
    setResetMessage('');
    try {
      const res = await api.resetSeedData();
      setResetMessage(res.message);
      fetchData();
    } catch (err: any) {
      alert("Reset error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0F766E]" />
            Municipal Administration & Supervisor Console
          </h1>
          <p className="text-xs text-[#6C757D]">
            Manage priority overrides with recorded rationale, assign work orders, and review audit trails.
          </p>
        </div>

        <button
          onClick={handleResetSeed}
          disabled={isResetting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-semibold rounded-md shadow-2xs transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          {isResetting ? 'Re-seeding Sandbox...' : 'Reset Demonstration Database'}
        </button>
      </div>

      {resetMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Grid: Incident Selector & Action Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-2xs p-4 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5] mb-2">
            <h3 className="text-xs font-semibold text-gray-900 uppercase">
              Municipal Incident Registry ({incidents.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">Select to Inspect</span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {incidents.map((inc) => {
              const effPriority = inc.priority_override ?? inc.priority_score;
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                    isSelected ? 'border-[#0F766E] bg-teal-50/40' : 'border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="font-mono text-gray-900">#{inc.incident_number}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-100 text-red-800">
                      Score: {Math.round(effPriority)}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800 line-clamp-1 mt-0.5">{inc.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                    <span>{inc.location.sector}</span>
                    <span className="uppercase font-semibold text-gray-600">{inc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Incident Actions: Override & Assignment */}
        <div className="lg:col-span-2 space-y-5">
          {selectedIncident ? (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-2xs p-5 space-y-5 text-xs">
              <div className="pb-3 border-b border-[#F1F3F5] flex items-center justify-between">
                <div>
                  <span className="font-mono text-gray-500">#{selectedIncident.incident_number}</span>
                  <h3 className="text-sm font-bold text-gray-900">{selectedIncident.title}</h3>
                  <span className="text-[11px] text-gray-600">
                    {selectedIncident.location.sector} • Landmark: {selectedIncident.location.landmark || 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Current Priority</span>
                  <span className="text-base font-extrabold text-red-700">
                    {Math.round(selectedIncident.priority_override ?? selectedIncident.priority_score)}/100
                  </span>
                </div>
              </div>

              {/* ACTION A: Priority Override with Recorded Reason */}
              <form onSubmit={handlePriorityOverride} className="p-3.5 rounded bg-gray-50 border border-gray-200 space-y-2.5">
                <span className="font-semibold text-gray-800 block text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E]" />
                  Administrative Priority Override (Logged to Audit Trail)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      New Override Score (0 to 100):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={overrideScore}
                      onChange={(e) => setOverrideScore(Number(e.target.value))}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Recorded Reason for Override *:
                    </label>
                    <input
                      type="text"
                      required
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="E.g., High VIP movement corridor / school route safety"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isOverriding || !overrideReason.trim()}
                  className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-gray-300 text-white rounded text-xs font-medium"
                >
                  {isOverriding ? 'Saving Override...' : 'Record Priority Override'}
                </button>

                {selectedIncident.override_reason && (
                  <p className="text-[11px] text-gray-600 mt-1 italic">
                    Previous Recorded Override: "{selectedIncident.override_reason}"
                  </p>
                )}
              </form>

              {/* ACTION B: Field Worker Assignment */}
              <form onSubmit={handleAssignWorker} className="p-3.5 rounded bg-teal-50/40 border border-teal-200 space-y-2.5">
                <span className="font-semibold text-teal-950 block text-xs flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-teal-700" />
                  Dispatch Assignment to Field Worker
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Select Field Worker:</label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    >
                      <option value="2">Vikram Singh (Sanitation & Drainage)</option>
                      <option value="3">Sunil Kumar (Roads & Illumination)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Dispatch Urgency:</label>
                    <select
                      value={assignmentPriority}
                      onChange={(e) => setAssignmentPriority(e.target.value)}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    >
                      <option value="critical">Critical (Immediate 2-hr response)</option>
                      <option value="high">High (Same day)</option>
                      <option value="medium">Medium (Routine schedule)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Est. Shift Hours:</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={assignmentHours}
                      onChange={(e) => setAssignmentHours(Number(e.target.value))}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Operational Instructions:</label>
                  <input
                    type="text"
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="E.g., Deploy suction pump and inspect upstream grating..."
                    className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#0D9488] text-white rounded text-xs font-medium"
                >
                  {isAssigning ? 'Dispatching Work Order...' : 'Assign & Notify Worker'}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-lg border border-[#E5E7EB] text-xs text-gray-500">
              Select an incident from the registry to manage overrides or assignments.
            </div>
          )}

          {/* Audit Logs Trail */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-900 uppercase">
              Immutable System & Override Audit Trail
            </h3>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-2 rounded bg-gray-50 border border-gray-200 text-[11px] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800">{log.action}</span>
                    <span className="text-gray-500 ml-1">by {log.user_name}</span>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {JSON.stringify(log.details || {})}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
