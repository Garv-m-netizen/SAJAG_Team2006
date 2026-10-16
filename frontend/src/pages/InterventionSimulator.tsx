import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Users,
  IndianRupee,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileText,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { InterventionPlan } from '../types';

export const InterventionSimulator: React.FC = () => {
  const [crews, setCrews] = useState<number>(2);
  const [budget, setBudget] = useState<number>(250000);
  const [hours, setHours] = useState<number>(48);
  const [weather, setWeather] = useState<string>('moderate_rain');
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [approvedNotice, setApprovedNotice] = useState<boolean>(false);

  const runSimulation = async () => {
    setIsLoading(true);
    setApprovedNotice(false);
    try {
      const data = await api.simulateIntervention({
        available_crews: crews,
        budget_inr: budget,
        time_hours: hours,
        weather_scenario: weather
      });
      setPlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [crews, budget, hours, weather]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#0F766E]" />
            Municipal Intervention Simulator
          </h1>
          <p className="text-xs text-[#6C757D]">
            Constrained optimization decision-support: dynamically balances crew skills, shift hours, and budget.
          </p>
        </div>

        <button
          onClick={runSimulation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] text-xs font-medium text-[#374151] rounded-md hover:bg-gray-50 shadow-2xs"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#0F766E] ${isLoading ? 'animate-spin' : ''}`} />
          Recalculate Optimal Dispatch
        </button>
      </div>

      {/* Interactive Constraint Sliders */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs">
        <h2 className="text-xs font-semibold text-[#1A1D20] mb-4 uppercase tracking-wider">
          Resource Constraints & Operational Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Available Crews Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                Available Crews:
              </span>
              <span className="font-bold text-[#0F766E]">{crews} Response Units</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={crews}
              onChange={(e) => setCrews(Number(e.target.value))}
              className="w-full accent-[#0F766E] cursor-pointer"
            />
            <span className="text-[10px] text-gray-400">1 to 4 specialized municipal crews</span>
          </div>

          {/* Budget Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-[#0F766E]" />
                Budget Ceiling:
              </span>
              <span className="font-bold text-[#0F766E]">₹{budget.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min="50000"
              max="500000"
              step="25000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[#0F766E] cursor-pointer"
            />
            <span className="text-[10px] text-gray-400">CPWD Schedule Rate Envelope</span>
          </div>

          {/* Hours Limit Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                Time Horizon:
              </span>
              <span className="font-bold text-[#0F766E]">{hours} Hours</span>
            </div>
            <input
              type="range"
              min="12"
              max="72"
              step="6"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-[#0F766E] cursor-pointer"
            />
            <span className="text-[10px] text-gray-400">Continuous shift turnaround</span>
          </div>

          {/* Weather Scenario Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700">
              Weather Multiplier:
            </label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="w-full p-2 border border-[#E5E7EB] rounded bg-white text-xs text-gray-800 focus:ring-1 focus:ring-teal-500"
            >
              <option value="dry_weather">Dry Weather (Standard)</option>
              <option value="moderate_rain">Moderate Rain (+15% Drainage Weight)</option>
              <option value="heavy_monsoon">Heavy Monsoon (+35% Flood Hazard)</option>
            </select>
            <span className="text-[10px] text-gray-400">Adjusts safety priority weighting</span>
          </div>
        </div>
      </div>

      {/* Recommended Plan Overview */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500">
          Running constrained multi-objective optimization knapsack...
        </div>
      ) : plan ? (
        <div className="space-y-6">
          {/* Summary KPIs of the Plan */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6C757D]">Incidents Addressed</span>
              <p className="text-xl font-bold text-teal-800">{plan.incidents_addressed_count} Reports</p>
              <span className="text-[10px] text-gray-500">Optimal coverage</span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6C757D]">Estimated Expenditure</span>
              <p className="text-xl font-bold text-[#1A1D20]">
                ₹{plan.total_estimated_cost.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-gray-500">
                {Math.round((plan.total_estimated_cost / budget) * 100)}% of ceiling used
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6C757D]">Cumulative Crew Hours</span>
              <p className="text-xl font-bold text-[#1A1D20]">{plan.total_estimated_hours} hrs</p>
              <span className="text-[10px] text-gray-500">Across {crews} available crews</span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/20 shadow-2xs">
              <span className="text-[11px] text-amber-900">Residual Backlog</span>
              <p className="text-xl font-bold text-amber-900">{plan.residual_risks?.length || 0} Excluded</p>
              <span className="text-[10px] text-amber-800">Requires budget expand</span>
            </div>
          </div>

          {/* Recommended Dispatch Actions Table */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1A1D20]">
                  Recommended Municipal Dispatch Schedule
                </h3>
                <p className="text-xs text-[#6C757D]">Ranked by utility optimization score</p>
              </div>

              {!approvedNotice ? (
                <button
                  onClick={() => setApprovedNotice(true)}
                  className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold rounded-md shadow-2xs"
                >
                  Approve Dispatch Plan &rarr;
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Plan Formally Approved by Administrator
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[#374151] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Incident Ref</th>
                    <th className="py-2.5 px-4 font-semibold">Assigned Crew</th>
                    <th className="py-2.5 px-4 font-semibold">Sector</th>
                    <th className="py-2.5 px-4 font-semibold">Priority</th>
                    <th className="py-2.5 px-4 font-semibold">Est. Cost</th>
                    <th className="py-2.5 px-4 font-semibold">Est. Time</th>
                    <th className="py-2.5 px-4 font-semibold">Optimization Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {plan.recommended_actions.map((act) => (
                    <tr key={act.incident_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                        #{act.incident_number}
                        <span className="block font-sans font-normal text-[11px] text-gray-500 truncate max-w-[150px]">
                          {act.title}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#0F766E]">
                        {act.assigned_crew}
                      </td>
                      <td className="py-2.5 px-4 text-gray-700">{act.sector}</td>
                      <td className="py-2.5 px-4 font-bold text-red-700">
                        {Math.round(act.priority_score)}/100
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        ₹{act.estimated_cost_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4">{act.estimated_hours} hrs</td>
                      <td className="py-2.5 px-4 text-gray-600 text-[11px] max-w-xs">
                        {act.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alternative Comparison Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.alternative_plans?.map((alt, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs text-xs space-y-2">
                <span className="font-semibold text-gray-900 text-sm block">{alt.plan_name}</span>
                <p className="text-gray-600 text-xs">{alt.rationale}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                  <span>Focus: <strong>{alt.focus}</strong></span>
                  <span className="font-mono font-semibold text-gray-800">
                    ₹{alt.estimated_cost_inr.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
