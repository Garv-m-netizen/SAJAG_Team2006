import React, { useEffect, useState } from 'react';
import { HardHat, ShieldCheck, Clock } from 'lucide-react';
import { api, mediaUrl } from '../services/api';
import { ResolutionSubmission } from '../types';

interface Props {
  incidentId: number;
}

// Renders the field worker's submitted proof exactly as filed (photos, notes, validation, timestamp),
// so citizens and municipal officers see the same record.
export const ResolutionProof: React.FC<Props> = ({ incidentId }) => {
  const [submissions, setSubmissions] = useState<ResolutionSubmission[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSubmissions(null);
    api.getSubmissions(incidentId)
      .then((data) => { if (!cancelled) setSubmissions(data); })
      .catch(() => { if (!cancelled) setSubmissions([]); });
    return () => { cancelled = true; };
  }, [incidentId]);

  if (submissions === null) {
    return <p className="text-xs text-gray-400">Loading worker proof...</p>;
  }
  if (submissions.length === 0) {
    return <p className="text-xs text-gray-500">No worker proof has been submitted for this incident yet.</p>;
  }

  const statusStyle = (s: string) =>
    s === 'valid'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className="space-y-3">
      {submissions.map((sub) => (
        <div key={sub.id} className="rounded-lg border border-teal-200 bg-teal-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-600">
            <span className="flex items-center gap-1 font-semibold text-gray-800">
              <HardHat className="w-3.5 h-3.5 text-amber-600" />
              Field worker proof #{sub.id}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(sub.submitted_at).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-100 rounded-lg p-2 border border-gray-200 text-center">
              <span className="text-[10px] font-bold text-gray-500 block mb-1">BEFORE WORK</span>
              {sub.before_photo_path ? (
                <img
                  src={mediaUrl(sub.before_photo_path)}
                  alt="Before repair"
                  className="w-full h-36 object-cover rounded border border-gray-300"
                />
              ) : (
                <div className="h-36 flex items-center justify-center text-[11px] text-gray-400">Not provided</div>
              )}
            </div>
            <div className="bg-teal-50/50 rounded-lg p-2 border border-teal-200 text-center">
              <span className="text-[10px] font-bold text-teal-800 block mb-1">AFTER RESOLUTION</span>
              <img
                src={mediaUrl(sub.after_photo_path)}
                alt="After resolution"
                className="w-full h-36 object-cover rounded border border-teal-300"
              />
            </div>
          </div>

          <div className="text-xs bg-white rounded border border-gray-200 p-2">
            <span className="font-semibold text-gray-700 block">Worker's resolution notes:</span>
            <p className="text-gray-800 whitespace-pre-wrap">{sub.resolution_notes}</p>
          </div>

          <div className={`text-[11px] rounded border p-2 flex items-start gap-1.5 ${statusStyle(sub.validation_status)}`}>
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="uppercase">{sub.validation_status}</strong>
              {sub.validation_notes ? ` — ${sub.validation_notes}` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
