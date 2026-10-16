import React, { useEffect, useState } from 'react';
import {
  Award,
  Shield,
  Star,
  CheckCircle2,
  Camera,
  Search,
  Trophy,
  History,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { LeaderboardEntry, BadgeItem, PointsLedgerEntry } from '../types';
import { useAuth } from '../context/AuthContext';

export const ChampionRewards: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dash, lb] = await Promise.all([
        api.getRewardsDashboard(),
        api.getLeaderboard(15)
      ]);
      setDashboard(dash);
      setLeaderboard(lb);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleTogglePrivacy = async () => {
    try {
      await api.togglePrivacy();
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return <Shield className="w-5 h-5 text-[#0F766E]" />;
      case 'Camera': return <Camera className="w-5 h-5 text-blue-600" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'Search': return <Search className="w-5 h-5 text-amber-600" />;
      case 'Award': return <Award className="w-5 h-5 text-purple-600" />;
      default: return <Star className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D20] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0F766E]" />
            Civic Champion Rewards & Recognition
          </h1>
          <p className="text-xs text-[#6C757D]">
            Rewarding meaningful, verified contributions and community reverification via an auditable points ledger.
          </p>
        </div>

        {dashboard && (
          <button
            onClick={handleTogglePrivacy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-gray-50 rounded-md transition-colors"
          >
            {dashboard.anonymous_pref ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Privacy Mode: Protected (Garv S.)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-gray-500" />
                <span>Privacy Mode: Public Name</span>
              </>
            )}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading civic rewards ledger...</div>
      ) : dashboard ? (
        <div className="space-y-6">
          {/* Top Profile & Progress Banner */}
          <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-xs text-[#6C757D]">Active Civic Standing</span>
              <h2 className="text-xl font-bold text-[#1A1D20]">{dashboard.display_name}</h2>
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                {dashboard.current_level}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#6C757D]">Total Verified Civic Points</span>
              <p className="text-3xl font-extrabold text-[#0F766E]">{dashboard.total_points} pts</p>
              <span className="text-[11px] text-gray-500">
                {dashboard.points_to_next > 0
                  ? `${dashboard.points_to_next} pts needed for ${dashboard.next_level}`
                  : 'Highest Champion Tier Unlocked'}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-[#6C757D]">Earned Digital Badges</span>
              <div className="flex items-center gap-2 pt-1">
                {dashboard.badges
                  .filter((b: BadgeItem) => b.is_earned)
                  .map((b: BadgeItem) => (
                    <div
                      key={b.id}
                      title={b.name}
                      className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shadow-2xs"
                    >
                      {getBadgeIcon(b.icon)}
                    </div>
                  ))}
              </div>
              <span className="text-[10px] text-gray-400 block">
                {dashboard.earned_badges_count} of {dashboard.badges.length} badges unlocked
              </span>
            </div>
          </div>

          {/* Badges Showcase Grid */}
          <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
              Civic Badges & Recognition Milestones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {dashboard.badges.map((b: BadgeItem) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-lg border text-xs text-center space-y-2 transition-all ${
                    b.is_earned
                      ? 'border-[#0F766E] bg-teal-50/30 shadow-2xs'
                      : 'border-[#E5E7EB] opacity-60 bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-white border border-[#E5E7EB] shadow-2xs">
                    {getBadgeIcon(b.icon)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#111827] text-xs">{b.name}</h4>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{b.description}</p>
                  </div>
                  <span className={`inline-block text-[10px] px-2 py-0.2 rounded font-semibold ${
                    b.is_earned ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {b.is_earned ? 'UNLOCKED' : `${b.points_threshold} pts`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid: Points Ledger + Annual Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Points Ledger (Auditable Log) */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-2xs p-4 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5] mb-2">
                <h3 className="text-xs font-semibold text-gray-900 uppercase flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#0F766E]" />
                  Auditable Points Ledger
                </h3>
                <span className="text-[11px] text-gray-500 font-mono">Anti-Farming Ledger</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {dashboard.ledger.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No transactions logged yet.</p>
                ) : (
                  dashboard.ledger.map((item: PointsLedgerEntry) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded border border-[#E5E7EB] flex items-center justify-between text-xs hover:bg-gray-50/50"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{item.description}</p>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(item.created_at).toLocaleString()} • {item.reason_code}
                        </span>
                      </div>
                      <span className="font-bold text-sm text-[#0F766E] flex-shrink-0">
                        +{item.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Annual Chandigarh Leaderboard */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-2xs p-4 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5] mb-2">
                <h3 className="text-xs font-semibold text-gray-900 uppercase flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Chandigarh Annual Civic Leaderboard
                </h3>
                <span className="text-[11px] text-gray-500">2026 Reporting Period</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FA] text-[#374151] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="py-2 px-2 font-semibold">Rank</th>
                      <th className="py-2 px-2 font-semibold">Contributor</th>
                      <th className="py-2 px-2 font-semibold">Sector</th>
                      <th className="py-2 px-2 font-semibold">Level</th>
                      <th className="py-2 px-2 font-semibold">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {leaderboard.map((entry) => (
                      <tr key={entry.rank} className="hover:bg-gray-50/60">
                        <td className="py-2 px-2 font-bold font-mono">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </td>
                        <td className="py-2 px-2 font-medium text-gray-900">{entry.display_name}</td>
                        <td className="py-2 px-2 text-gray-600">{entry.sector}</td>
                        <td className="py-2 px-2 text-gray-600 text-[11px]">{entry.level}</td>
                        <td className="py-2 px-2 font-bold text-[#0F766E] font-mono">{entry.total_points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
