import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { LocationPicker } from '../components/map/LocationPicker';
import { useAuth } from '../context/AuthContext';
import { IncidentCategory } from '../types';

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
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        description,
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
                required
                placeholder="Write in Hindi, Punjabi, or English. E.g., 'Aroma hotel ke paas naali jam hai' or 'Sector 35 road has deep pothole'..."
                className="w-full text-xs p-3 rounded-md border border-[#E5E7EB] focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none text-[#1A1D20]"
              />
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
                  <option value="Sector 17">Sector 17 (City Center / Plaza)</option>
                  <option value="Sector 22">Sector 22 (Aroma / Mobile Market)</option>
                  <option value="Sector 26">Sector 26 (Grain Market / Madhya Marg)</option>
                  <option value="Sector 35">Sector 35 (Kisan Bhawan / Commercial)</option>
                  <option value="Sector 43">Sector 43 (ISBT / District Court)</option>
                  <option value="Sector 45">Sector 45 (Residential / Burail)</option>
                  <option value="Manimajra">Manimajra (Housing Complex)</option>
                  <option value="Industrial Area Phase 1">Industrial Area Phase 1 (Tribune Chowk)</option>
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
                disabled={isSubmitting || !description.trim()}
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
