import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

interface Props {
  onCapture: (file: File) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

// Opens the device camera in a modal, and hands back the snapped frame as a JPEG File.
export const CameraCapture: React.FC<Props> = ({ onCapture, label = 'Take Photo', disabled, className }) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not available in this browser (HTTPS or localhost is required).');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err: any) {
        setError(err.message || 'Could not access the camera. Please allow camera permission.');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  const close = () => {
    stop();
    setOpen(false);
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        close();
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-[#E5E7EB] text-[#374151] hover:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        <Camera className="w-3.5 h-3.5" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Capture Photo</h3>
              <button type="button" onClick={close} aria-label="Close camera" className="text-gray-500 hover:text-gray-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error ? (
              <p className="text-xs text-red-700 py-6 text-center">{error}</p>
            ) : (
              <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black aspect-[4/3] object-cover" />
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs rounded-md border border-[#E5E7EB] text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={snap}
                disabled={!!error}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0F766E] text-white disabled:bg-gray-300"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
