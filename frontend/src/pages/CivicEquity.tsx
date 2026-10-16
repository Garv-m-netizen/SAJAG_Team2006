import React, { useEffect, useState } from 'react';
import {
  Scale,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldAlert,
  Layers,
  HelpCircle,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../services/api';
import { CivicEquityOverview, EquitySectorMetric } from '../types';

export const CivicEquity: React.FC = () => {
  const [equityData, setEquityData] = useState<CivicEquityOverview | null>(null);
  const [selectedSector, setSelectedSector] = useState<EquitySectorMetric | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEquity = async () => {
      try {
        const data = await api.getEquityOverview();
        setEquityData(data);
        if (data.sectors.length > 0) {
          setSelectedSector(data.sectors[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquity();
  }, []);

  const chartData = equityData?.sectors.map(s => ({
    name: s.sector.replace('Sector ', 'Sec '),
    resolution_hours: s.avg_resolution_hours,
    equity_score: s.equity_score,
    flagged: s.flagged_for_review
  })) || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-3">
        <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#0F766E]" />
          Civic Equity & Neglected-Area Detection
        </h1>
        <p className="text-xs text-[#6C757D]">
          Area-level equity index distinguishing reporting frequency from underlying neglect and structural response delay.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500">
          Analyzing resolution latency and demographic service equity...
        </div>
      ) : equityData ? (
        <div className="space-y-6">
          {/* Top High-level Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs">
              <span className="text-xs text-[#6C757D]">Citywide Average Resolution Time</span>
              <p className="text-2xl font-bold text-[#1A1D20]">{equityData.city_avg_resolution_hours} hrs</p>
              <span className="text-[10px] text-gray-500">Municipal baseline across Chandigarh</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-red-200 bg-red-50/20 shadow-2xs">
              <span className="text-xs text-red-700">Flagged for Supervisory Equity Review</span>
              <p className="text-2xl font-bold text-red-700">{equityData.total_flagged_sectors} Sectors</p>
              <span className="text-[10px] text-red-600 font-medium">Exceeds equity neglect threshold</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs">
              <span className="text-xs text-[#6C757D]">Highest Priority Attention Required</span>
              <p className="text-xl font-bold text-teal-800">{equityData.highest_neglect_sector}</p>
              <span className="text-[10px] text-gray-500">Longest delay / high chronic hotspots</span>
            </div>
          </div>

          {/* Recharts Bar Chart: Resolution Latency by Sector */}
          <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1A1D20]">
                  Average Resolution Time (Hours) by Sector
                </h3>
                <p className="text-xs text-[#6C757D]">
                  Red bars indicate sectors significantly slower than the citywide average ({equityData.city_avg_resolution_hours}h).
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit="h" />
                  <Tooltip
                    formatter={(val: any) => [`${val} hours`, 'Avg Resolution Time']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', fontSize: '12px' }}
                  />
                  <Bar dataKey="resolution_hours" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.flagged ? '#EF4444' : '#0D9488'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Equity Breakdown Table & Detailed Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] shadow-2xs overflow-hidden">
              <div className="p-3.5 border-b border-[#E5E7EB]">
                <h3 className="text-xs font-semibold text-gray-900 uppercase">
                  Chandigarh Sector Equity Ledger
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FA] text-[#374151] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Sector</th>
                      <th className="py-2.5 px-3 font-semibold">Total Reports</th>
                      <th className="py-2.5 px-3 font-semibold">Avg Delay</th>
                      <th className="py-2.5 px-3 font-semibold">Recurring Hotspots</th>
                      <th className="py-2.5 px-3 font-semibold">Neglect Index</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {equityData.sectors.map((sec) => (
                      <tr
                        key={sec.sector}
                        onClick={() => setSelectedSector(sec)}
                        className={`cursor-pointer transition-colors ${
                          selectedSector?.sector === sec.sector
                            ? 'bg-teal-50/50 font-medium'
                            : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{sec.sector}</td>
                        <td className="py-2.5 px-3">{sec.total_reported}</td>
                        <td className="py-2.5 px-3 font-mono">{sec.avg_resolution_hours}h</td>
                        <td className="py-2.5 px-3">{sec.recurring_hotspots_count}</td>
                        <td className="py-2.5 px-3 font-bold text-red-700">
                          {Math.round(sec.equity_score)}/100
                        </td>
                        <td className="py-2.5 px-3">
                          {sec.flagged_for_review ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              FLAGGED
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              OPTIMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Sector Factor Explanation */}
            {selectedSector && (
              <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-2xs text-xs space-y-3">
                <div className="pb-2 border-b border-[#F1F3F5]">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">Area Assessment</span>
                  <h4 className="text-sm font-bold text-[#111827]">{selectedSector.sector}</h4>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6C757D]">Active Unresolved Backlog:</span>
                    <span className="font-bold text-[#111827]">{selectedSector.unresolved_count} Incidents</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C757D]">Severe/Critical Hazards:</span>
                    <span className="font-bold text-red-700">{selectedSector.severe_unresolved_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C757D]">Infrastructure Vulnerabilities:</span>
                    <span className="font-bold text-purple-700">{selectedSector.infrastructure_vulnerabilities}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F3F5]">
                  <span className="font-semibold text-gray-900 block mb-1">
                    Transparent Flagging Reasons:
                  </span>
                  <ul className="text-[11px] text-[#4B5563] space-y-1 list-disc list-inside">
                    {selectedSector.flag_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-[#F1F3F5] text-[10px] text-gray-500 leading-snug">
                  Civic Equity Principle: Low complaint count alone does not signify municipal health. Systems evaluate delayed turnaround and unaddressed recurring hotspots.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
