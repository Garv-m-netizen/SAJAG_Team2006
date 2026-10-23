import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, HelpCircle, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { CitizenFeedback } from '../types';

interface Props {
  incidentId: number;
}

const TYPE_META: Record<string, { label: string; style: string; Icon: React.ElementType }> = {
  confirmed_resolved: { label: 'Confirmed resolved', style: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: ThumbsUp },
  problem_still_exists: { label: 'Problem still exists', style: 'bg-red-50 border-red-200 text-red-900', Icon: ThumbsDown },
  unable_to_verify: { label: 'Unable to verify', style: 'bg-gray-50 border-gray-200 text-gray-800', Icon: HelpCircle },
};

// Citizen reverification verdicts and comments for an incident (field workers and officers only).
export const CitizenFeedbackList: React.FC<Props> = ({ incidentId }) => {
  const [items, setItems] = useState<CitizenFeedback[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    api.getIncidentFeedback(incidentId)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [incidentId]);

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-[#0F766E]" />
        Citizen Feedback {items ? `(${items.length})` : ''}
      </span>
      {items === null ? (
        <p className="text-xs text-gray-400">Loading citizen feedback...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-500">No citizen has reverified this work yet.</p>
      ) : (
        items.map((f) => {
          const meta = TYPE_META[f.feedback_type] ?? TYPE_META.unable_to_verify;
          return (
            <div key={f.id} className={`rounded-lg border p-2.5 text-xs ${meta.style}`}>
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  <meta.Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
                <span className="text-[10px] font-normal opacity-80">
                  {f.user_name || 'Citizen'} • {new Date(f.submitted_at).toLocaleString()}
                </span>
              </div>
              {f.comments && <p className="mt-1 italic">"{f.comments}"</p>}
            </div>
          );
        })
      )}
    </div>
  );
};
