import React from 'react';
import { mediaUrl } from '../services/api';
import { Evidence } from '../types';

interface Props {
  evidence?: Evidence[];
  size?: 'sm' | 'md';
}

/** Citizen-submitted photos (click to open full size) and voice notes for an incident. */
export const IncidentEvidenceGallery: React.FC<Props> = ({ evidence, size = 'md' }) => {
  const photos = (evidence || []).filter((ev) => ev.file_type.startsWith('image'));
  const audio = (evidence || []).filter((ev) => ev.file_type.startsWith('audio'));
  if (photos.length === 0 && audio.length === 0) return null;

  const dim = size === 'sm' ? 'w-16 h-16' : 'w-24 h-24';
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-gray-700 block">Citizen Evidence:</span>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((ev) => (
            <a key={ev.id} href={mediaUrl(ev.file_path)} target="_blank" rel="noreferrer">
              <img
                src={mediaUrl(ev.file_path)}
                alt="Citizen-submitted issue photo"
                className={`${dim} object-cover rounded-md border border-gray-200`}
              />
            </a>
          ))}
        </div>
      )}
      {audio.map((ev) => (
        <audio key={ev.id} controls src={mediaUrl(ev.file_path)} className="w-full h-9" />
      ))}
    </div>
  );
};
