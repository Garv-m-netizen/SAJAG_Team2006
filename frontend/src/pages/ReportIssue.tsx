import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Mic,
  Camera,
  Languages,
  Shield,
  MapPin,
  Clock,
  ArrowRight,
  Wand2
} from 'lucide-react';
import { api } from '../services/api';
import { CameraCapture } from '../components/CameraCapture';
import { LocationPicker } from '../components/map/LocationPicker';
import { useAuth } from '../context/AuthContext';
import { IncidentCategory } from '../types';
import { SECTOR_OPTIONS, resolveLocation } from '../data/chandigarhSectors';

const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
];

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const joinText =(a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(' ');

export const ReportIssue: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [sector, setSector] = useState('Sector 22');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState(30.7328);
  const [longitude, setLongitude] = useState(76.7729);
  const [isGps, setIsGps] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<any>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Photo evidence
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState('');
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    addPhotoFiles(picked);
  };

  const addPhotoFiles = (picked: File[]) => {
    setPhotoError('');
    const accepted: { file: File; url: string }[] = [];
    for (const file of picked) {
      if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
        setPhotoError(`"${file.name}" is not a JPG, PNG or WebP image.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`"${file.name}" is larger than 10 MB.`);
        continue;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length;
      if (accepted.length > room) setPhotoError(`You can attach up to ${MAX_PHOTOS} photos.`);
      accepted.slice(room).forEach((p) => URL.revokeObjectURL(p.url));
      return [...prev, ...accepted.slice(0, room)];
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Live speech-to-text + LLM field extraction
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState('');
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef(false);
  const baseTextRef = useRef('');

  const sectorOptions = SECTOR_OPTIONS.some((o) => o.value === sector)
    ? SECTOR_OPTIONS
    : [...SECTOR_OPTIONS, { value: sector, label: sector }];

  // Fills category / sector / landmark from text (Gemini -> Groq -> OpenRouter on the server) and moves the map pin.
  const runExtraction = async (text: string) => {
    if (!text.trim()) return;
    setIsExtracting(true);
    setExtractNote('');
    try {
      const res = await api.extractReport(text);
      if (res.category) setCategory(res.category);
      if (res.language) setSelectedLanguage(res.language);
      if (res.sector) setSector(res.sector);
      if (res.landmark) setLandmark(res.landmark);

      let pinned = false;
      if (res.sector) {
        const coords = await resolveLocation(res.sector, res.landmark);
        if (coords) {
          setLatitude(coords.lat);
          setLongitude(coords.lon);
          setIsGps(false);
          pinned = true;
        }
      }
      const found = [
        `category: ${res.category.replace(/_/g, ' ')}`,
        res.sector ? `${res.sector}${pinned ? ' (pin placed)' : ''}` : null,
        res.landmark ? `landmark: ${res.landmark}` : null,
      ].filter(Boolean).join(' • ');
      setExtractNote(
        res.provider === 'local'
          ? `No LLM API key is configured or all providers failed — used built-in keyword extraction. ${found}`
          : `Auto-filled by ${res.provider}: ${found}`
      );
    } catch (err: any) {
      setExtractNote('Auto-fill failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsExtracting(false);
    }
  };

  const startRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = voiceLang;
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = '';

    rec.onresult = (ev: any) => {
      let interim = '';
      finalText = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setDescription(joinText(baseTextRef.current, finalText + ' ' + interim));
    };
    rec.onerror = (ev: any) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        recordingRef.current = false;
        setMicError('Speech recognition was blocked by the browser.');
      }
    };
    rec.onend = () => {
      baseTextRef.current = joinText(baseTextRef.current, finalText);
      setDescription(baseTextRef.current);
      if (recordingRef.current) {
        startRecognition(); // the browser ends a session after silence; keep listening
      } else {
        runExtraction(baseTextRef.current);
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  };

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicError('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      };
      recorderRef.current = recorder;
      recorder.start();
      recordingRef.current = true;
      baseTextRef.current = description;
      startRecognition();
      setRecordSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setMicError('Microphone access was denied or unavailable.');
    }
  };

  const stopRecording = () => {
    stopTimer();
    recordingRef.current = false;
    recorderRef.current?.stop();
    if (recognitionRef.current) recognitionRef.current.stop(); // its onend runs the extraction
    setIsRecording(false);
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setAudioBlob(null);
    setRecordSeconds(0);
  };

  useEffect(() => () => {
    stopTimer();
    recordingRef.current = false;
    if (recognitionRef.current) recognitionRef.current.abort();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  // Deterministic local extraction preview
  const [aiPreview, setAiPreview] = useState<any>(null);

  useEffect(() => {
    if (!description.trim()) {
      setAiPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      const text = description.toLowerCase();

      let detectedLang = 'en';
      if (/[\u0A00-\u0A7F]/.test(description)) detectedLang = 'pa';
      else if (/[\u0900-\u097F]/.test(description)) detectedLang = 'hi';

      let inferredCat = category;
      if (text.includes('drain') || text.includes('waterlogging') || text.includes('नाला') || text.includes('नाली') || text.includes('ਪਾਣੀ')) {
        inferredCat = 'drainage_waterlogging';
      } else if (text.includes('garbage') || text.includes('trash') || text.includes('कचरा') || text.includes('कूड़ा') || text.includes('ਕੂੜਾ')) {
        inferredCat = 'garbage_sanitation';
      } else if (text.includes('pothole') || text.includes('road') || text.includes('गड्ढा') || text.includes('ਟੋਆ')) {
        inferredCat = 'potholes_roads';
      } else if (text.includes('light') || text.includes('dark') || text.includes('बत्ती') || text.includes('ਹਨੇਰਾ')) {
        inferredCat = 'broken_streetlights';
      } else if (text.includes('pipe') || text.includes('water supply') || text.includes('लीक')) {
        inferredCat = 'water_supply';
      }

      let urgency = 'medium';
      if (text.includes('danger') || text.includes('accident') || text.includes('खतरा') || text.includes('ਖ਼ਤਰਾ') || text.includes('fatal')) {
        urgency = 'critical';
      } else if (text.includes('overflow') || text.includes('blocked') || text.includes('hospital') || text.includes('school')) {
        urgency = 'high';
      }

      setAiPreview({
        language: detectedLang,
        inferredCategory: inferredCat,
        urgency,
        confidence: Math.min(0.95, 0.65 + (text.length > 30 ? 0.2 : 0.1)),
        safetyConcerns: urgency === 'critical' ? ['High safety impact keyword detected in narrative'] : []
      });

      if (category === 'other' && inferredCat !== 'other') {
        setCategory(inferredCat);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !audioBlob && photos.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        description: description.trim() || (audioBlob
          ? 'Voice report submitted by citizen (audio recording attached).'
          : 'Photo report submitted by citizen (photo evidence attached).'),
        category,
        language: aiPreview?.language || selectedLanguage,
        sector,
        landmark,
        latitude,
        longitude,
        is_gps_verified: isGps,
        anonymous_public: false
      };

      const result = await api.submitReport(payload);
      if (audioBlob) {
        try {
          const ext = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
          const form = new FormData();
          form.append('file', audioBlob, `voice-report.${ext}`);
          form.append('caption', 'Citizen voice recording');
          await api.uploadEvidence(result.id, form);
        } catch (uploadErr: any) {
          alert("Report lodged, but the voice recording failed to upload: " + (uploadErr.response?.data?.detail || uploadErr.message));
        }
        discardRecording();
      }
      if (photos.length > 0) {
        const failed: string[] = [];
        for (const p of photos) {
          try {
            const form = new FormData();
            form.append('file', p.file, p.file.name);
            form.append('caption', 'Citizen photo evidence');
            await api.uploadEvidence(result.id, form);
          } catch (uploadErr: any) {
            failed.push(`${p.file.name}: ${uploadErr.response?.data?.detail || uploadErr.message}`);
          }
        }
        if (failed.length > 0) {
          alert("Report lodged, but some photos failed to upload:\n" + failed.join('\n'));
        }
        photos.forEach((p) => URL.revokeObjectURL(p.url));
        setPhotos([]);
      }
      setSubmittedIncident(result);
    } catch (err: any) {
      console.error(err);
      alert("Submission error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTemplate = (text: string, lang: string, sec: string, lm: string) => {
    setDescription(text);
    setSelectedLanguage(lang);
    setSector(sec);
    setLandmark(lm);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="border-b border-[#E5E7EB] pb-3">
        <h1 className="text-xl font-bold text-[#1A1D20]">Report a Civic Problem</h1>
        <p className="text-xs text-[#6C757D]">
          Submit issues in Hindi, Punjabi, or English with automatic intent extraction and transparent priority calculation.
        </p>
      </div>

      {submittedIncident ? (
        /* Success State */
        <div className="bg-white rounded-lg border border-emerald-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-900">
                Civic Report Lodged Successfully!
              </h2>
              <p className="text-xs text-emerald-700">
                Official Tracking ID: <span className="font-mono font-bold">#{submittedIncident.incident_number}</span>
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#F8F9FA] rounded-md border border-[#E5E7EB] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#6C757D]">Calculated Priority Score:</span>
              <span className="font-bold text-red-700 text-sm">{submittedIncident.priority_score}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6C757D]">Urgency Level:</span>
              <span className="font-bold uppercase text-[#1F2937]">{submittedIncident.urgency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6C757D]">Civic Points Awarded:</span>
              <span className="font-bold text-[#0F766E]">+10 Points Added to Ledger</span>
            </div>
            {submittedIncident.ai_extraction_meta?.priority_explanation && (
              <p className="text-[11px] text-gray-600 pt-2 border-t border-gray-200">
                <strong>Transparent Explanation:</strong> {submittedIncident.ai_extraction_meta.priority_explanation}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/my-reports')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F766E] text-white text-xs font-medium rounded-md hover:bg-[#0D9488]"
            >
              View in My Reports <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setSubmittedIncident(null);
                setDescription('');
                setLandmark('');
              }}
              className="px-4 py-2 bg-white border border-[#E5E7EB] text-xs font-medium text-[#374151] rounded-md hover:bg-gray-50"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      ) : (
        /* Main Submission Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form inputs */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs">
            {/* Quick multilingual templates */}
            <div className="bg-[#F8F9FA] p-3 rounded-md border border-[#E5E7EB]">
              <span className="text-xs font-semibold text-[#374151] flex items-center gap-1.5 mb-2">
                <Languages className="w-3.5 h-3.5 text-[#0F766E]" />
                Try Sample Prompts (Hindi, Punjabi, English):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickTemplate(
                    "सेक्टर 22 में नाला पूरी तरह से जाम है और गंदा पानी सड़क पर बह रहा है, बदबू आ रही है।",
                    "hi",
                    "Sector 22",
                    "Near Aroma Chowk"
                  )}
                  className="px-2 py-1 text-[11px] bg-white border border-[#E5E7EB] rounded hover:border-teal-500 text-[#374151]"
                >
                  Hindi: सीवर व नाला जाम
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate(
                    "ਸੈਕਟਰ 35 ਵਿੱਚ ਵੱਡਾ ਟੋਆ ਪੈ ਗਿਆ ਹੈ, ਐਕਸੀਡੈਂਟ ਦਾ ਖ਼ਤਰਾ ਹੈ।",
                    "pa",
                    "Sector 35",
                    "Kisan Bhawan Roundabout"
                  )}
                  className="px-2 py-1 text-[11px] bg-white border border-[#E5E7EB] rounded hover:border-teal-500 text-[#374151]"
                >
                  Punjabi: ਸੜਕ ਦਾ ਖ਼ਤਰਨਾਕ ਟੋਆ
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate(
                    "Severe garbage dump accumulation outside booth market obstructing walkway.",
                    "en",
                    "Sector 22",
                    "Booth Market Line B"
                  )}
                  className="px-2 py-1 text-[11px] bg-white border border-[#E5E7EB] rounded hover:border-teal-500 text-[#374151]"
                >
                  English: Garbage Accumulation
                </button>
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                Describe the Problem (Hindi, Punjabi, or English) *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required={!audioBlob && photos.length === 0}
                placeholder="Write in Hindi, Punjabi, or English. E.g., 'Aroma hotel ke paas naali jam hai' or 'Sector 35 road has deep pothole'..."
                className="w-full text-xs p-3 rounded-md border border-[#E5E7EB] focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none text-[#1A1D20]"
              />
            </div>

            {/* Photo Evidence */}
            <div className="bg-[#F8F9FA] p-3 rounded-md border border-[#E5E7EB] space-y-2">
              <span className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#0F766E]" />
                Attach Photos of the Issue (up to {MAX_PHOTOS}, +5 points)
              </span>
              <div className="flex flex-wrap gap-2">
              <CameraCapture
                label="Capture with Camera"
                disabled={photos.length >= MAX_PHOTOS}
                onCapture={(f) => addPhotoFiles([f])}
              />
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-[#E5E7EB] text-[#374151] ${
                  photos.length >= MAX_PHOTOS ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-teal-500'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {photos.length > 0 ? 'Add More Photos' : 'Upload from Device'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={photos.length >= MAX_PHOTOS}
                  onChange={addPhotos}
                  className="hidden"
                />
              </label>
              </div>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <div key={p.url} className="relative w-20 h-20">
                      <img src={p.url} alt={`Issue photo ${i + 1}`} className="w-full h-full object-cover rounded-md border border-[#E5E7EB]" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photoError && <p className="text-[11px] text-red-700">{photoError}</p>}
            </div>

            {/* Voice Recording */}
            <div className="bg-[#F8F9FA] p-3 rounded-md border border-[#E5E7EB] space-y-2">
              <span className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#0F766E]" />
                Or Record a Voice Report (speech is transcribed above)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  disabled={isRecording}
                  title="Spoken language"
                  className="text-xs p-1.5 rounded-md border border-[#E5E7EB] bg-white outline-none"
                >
                  {VOICE_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Stop ({recordSeconds}s)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-[#E5E7EB] hover:border-teal-500 text-[#374151] flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {audioBlob ? 'Re-record' : 'Start Recording'}
                  </button>
                )}
                {audioBlob && !isRecording && (
                  <button
                    type="button"
                    onClick={discardRecording}
                    className="px-3 py-1.5 text-xs rounded-md text-red-700 hover:bg-red-50"
                  >
                    Discard
                  </button>
                )}
              </div>
              {audioUrl && !isRecording && <audio controls src={audioUrl} className="w-full h-9" />}
              {micError && <p className="text-[11px] text-red-700">{micError}</p>}
              {isRecording && <p className="text-[11px] text-teal-800">Listening… your words appear in the description box.</p>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => runExtraction(description)}
                  disabled={isExtracting || isRecording || !description.trim()}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-gray-300 text-white flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {isExtracting ? 'Reading your report…' : 'Auto-fill category, sector & map pin'}
                </button>
                {extractNote && <span className="text-[11px] text-teal-900">{extractNote}</span>}
              </div>
            </div>

            {/* Category and Sector Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E5E7EB] bg-white focus:ring-1 focus:ring-[#0F766E] outline-none"
                >
                  <option value="garbage_sanitation">Garbage & Sanitation</option>
                  <option value="drainage_waterlogging">Drainage & Waterlogging</option>
                  <option value="potholes_roads">Potholes & Damaged Roads</option>
                  <option value="broken_streetlights">Broken Streetlights</option>
                  <option value="water_supply">Water Supply & Leakage</option>
                  <option value="infrastructure_damage">Public Infrastructure Damage</option>
                  <option value="traffic_safety">Traffic & Pedestrian Safety</option>
                  <option value="other">Other Civic Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                  Chandigarh Sector / Area *
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E5E7EB] bg-white focus:ring-1 focus:ring-[#0F766E] outline-none"
                >
                  {sectorOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                Landmark or Street Clue (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="E.g., Near Booth No 42, Opposite Government Dispensary"
                className="w-full text-xs p-2 rounded-md border border-[#E5E7EB] focus:ring-1 focus:ring-[#0F766E] outline-none"
              />
            </div>

            {/* Map Pin Placement */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                Confirm Incident Pin on Map *
              </label>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                sector={sector}
                onChange={(lat, lon, isGpsVal) => {
                  setLatitude(lat);
                  setLongitude(lon);
                  setIsGps(isGpsVal);
                }}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isRecording || (!description.trim() && !audioBlob && photos.length === 0)}
                className="w-full py-2.5 px-4 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-gray-300 text-white font-medium text-xs rounded-md shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Evaluating & Submitting...' : 'Submit Verified Civic Complaint'}
              </button>
            </div>
          </form>

          {/* AI Intelligence Extraction Preview Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F1F3F5]">
                <Sparkles className="w-4 h-4 text-[#0F766E]" />
                <h3 className="text-xs font-semibold text-[#111827]">
                  Extraction Preview
                </h3>
              </div>

              {aiPreview ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6C757D]">Detected Language:</span>
                    <span className="font-bold text-[#111827] uppercase">{aiPreview.language}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#6C757D]">Inferred Category:</span>
                    <span className="font-medium text-[#0F766E] capitalize">
                      {aiPreview.inferredCategory.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#6C757D]">Urgency Estimate:</span>
                    <span className={`font-bold uppercase ${
                      aiPreview.urgency === 'critical' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {aiPreview.urgency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#6C757D]">Extraction Confidence:</span>
                    <span className="font-semibold text-gray-800">
                      {Math.round(aiPreview.confidence * 100)}%
                    </span>
                  </div>

                  {aiPreview.safetyConcerns?.length > 0 && (
                    <div className="p-2 rounded bg-red-50 border border-red-200 text-red-800 text-[11px]">
                      <strong>Safety Flag:</strong> {aiPreview.safetyConcerns[0]}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#F1F3F5] text-[10px] text-[#6C757D]">
                    Deterministic Civic Extraction Engine v1.0 • Ready for Multilingual LLM Integration
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#9CA3AF]">
                  Type a complaint description in Hindi, Punjabi, or English to see extraction.
                </div>
              )}
            </div>

            {/* Citizen Point Incentive Notice */}
            <div className="bg-teal-50/60 p-3.5 rounded-lg border border-teal-200 text-xs text-teal-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-teal-950">
                <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Civic Champion Reward Rules</span>
              </div>
              <ul className="text-[11px] text-teal-800 space-y-1 list-disc list-inside">
                <li>Valid complaint lodged: <strong>+10 points</strong></li>
                <li>Clear evidence attached: <strong>+5 points</strong></li>
                <li>Resolution confirmed: <strong>+15 points</strong></li>
                <li>Level up to earn digital certificates</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
