import React, { useEffect, useState } from 'react';
import {
  Activity,
  CloudRain,
  Sun,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw,
  Umbrella
} from 'lucide-react';
import { api } from '../services/api';
import { RiskAssessment } from '../types';

export const RippleIntelligence: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('moderate_rain');
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const scList = await api.getWeatherScenarios();
        setScenarios(scList);
      } catch (e) {
        console.error(e);
      }
    };
    fetchScenarios();
  }, []);

  const runAssessment = async () => {
    setIsLoading(true);
    try {
      const data = await api.assessRippleRisks(selectedScenario);
      setRisks(data);
    } catch (e) {
      console.error("Error assessing ripple risks:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAssessment();
  }, [selectedScenario]);

  const getSeverityBadge = (sev: string) => {
    if (sev === 'critical') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">CRITICAL RISK</span>;
    if (sev === 'high') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">HIGH RISK</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">MODERATE</span>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0F766E]" />
            Civic Ripple Intelligence
          </h1>
          <p className="text-xs text-[#6C757D]">
            Predictive downstream civic consequences combining active incident reports, infrastructure vulnerabilities, and rainfall simulations.
          </p>
        </div>

        {/* Weather Simulation Banner Tag */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
          <Umbrella className="w-3.5 h-3.5 text-amber-600" />
          Simulated Weather Models Active
        </span>
      </div>

      {/* Interactive Weather Scenario Control */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#1F2937] flex items-center gap-1.5">
            <CloudRain className="w-4 h-4 text-[#0F766E]" />
            Select Synthetic Meteorological Scenario:
          </span>
          <span className="text-[11px] text-[#6C757D]">
            Pluggable interface ready for Indian Meteorological Dept (IMD) API
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {scenarios.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenario(sc.id)}
                className={`p-3 rounded-md border text-left transition-all ${
                  isSelected
                    ? 'border-[#0F766E] bg-teal-50/50 shadow-xs'
                    : 'border-[#E5E7EB] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-xs text-[#1A1D20] mb-1">
                  <span>{sc.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    sc.risk_multiplier > 2 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {sc.risk_multiplier}x Multiplier
                  </span>
                </div>
                <p className="text-[11px] text-[#4B5563] leading-snug">{sc.description}</p>
                <span className="text-[10px] text-gray-500 block mt-1 font-mono">
                  Rainfall: {sc.rainfall_mm} mm
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Downstream Risk Assessments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A1D20]">
            Anticipated Downstream Risks ({risks.length} Scenarios Detected)
          </h2>
          <span className="text-xs text-[#6C757D]">Ranked by Severity & Infrastructure Exposure</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            Simulating hydrodynamic and infrastructure stress models...
          </div>
        ) : risks.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-[#E5E7EB] text-xs text-gray-500">
            No critical downstream risks detected under selected scenario.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risks.map((r) => (
              <div
                key={r.id}
                className={`bg-white rounded-lg border p-4 shadow-2xs space-y-3 transition-all ${
                  r.score >= 80 ? 'border-red-300 bg-red-50/10' : 'border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#F1F3F5]">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">{r.sector}</span>
                    <h3 className="font-bold text-sm text-[#1A1D20] leading-snug">{r.risk_type}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {getSeverityBadge(r.severity)}
                    <p className="text-xs font-bold text-red-700 mt-1">{Math.round(r.score)}/100</p>
                  </div>
                </div>

                {/* Supporting evidence */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-700">Supporting Evidence:</span>
                  <ul className="text-xs text-[#4B5563] space-y-0.5 list-disc list-inside">
                    {r.supporting_evidence?.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended preventive action */}
                <div className="p-2.5 rounded bg-[#F0FDFA] border border-[#CCFBF1] text-xs">
                  <span className="font-semibold text-teal-900 block mb-0.5">Recommended Preventive Action:</span>
                  <p className="text-teal-800 text-[11px] leading-relaxed">{r.recommended_action}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F1F3F5] text-[10px] text-[#6C757D]">
                  <span>Relationship: <strong>Inferred Hypothesis</strong></span>
                  <span>Confidence: {Math.round((r.confidence_rating || 0.85) * 100)}%</span>
                  <span>Physical Inspection: <strong>Required</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
