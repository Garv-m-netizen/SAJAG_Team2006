import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  FileText,
  ShieldCheck,
  Award,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Eye,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';
import { useAuth } from '../context/AuthContext';
import { useReverifiedIds } from '../hooks/useReverifiedIds';
import { IncidentMap } from '../components/map/IncidentMap';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [allPendingVerifications, setPendingVerifications] = useState<Incident[]>([]);
  const [rewardsData, setRewardsData] = useState<any>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quickVerifySuccess, setQuickVerifySuccess] = useState<string | null>(null);
  const reverifiedIds = useReverifiedIds();
  const pendingVerifications = allPendingVerifications.filter((i) => !reverifiedIds.includes(i.id));

  useEffect(() => {
    const fetchCitizenData = async () => {
      setIsLoading(true);
      try {
        const [myIncs, allIncs, pendingIncs, rewards] = await Promise.all([
          api.getMyIncidents().catch(() => []),
          api.getIncidents({ limit: 30 }).catch(() => []),
          api.getIncidents({ status: 'awaiting_verification' }).catch(() => []),
          api.getRewardsDashboard().catch(() => null)
        ]);
        setMyIncidents(myIncs);
        setAllIncidents(allIncs);
        setPendingVerifications(pendingIncs);
        setRewardsData(rewards);
      } catch (err) {
        console.error("Error loading citizen dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCitizenData();
  }, [user]);

  const activeReportsCount = myIncidents.filter(
    (i) => !['resolved', 'rejected', 'duplicate'].includes(i.status)
  ).length;

  const resolvedReportsCount = myIncidents.filter(
    (i) => i.status === 'resolved'
  ).length;

  const userPoints = user?.profile?.total_points ?? rewardsData?.total_points ?? 0;
  const userLevel = user?.profile?.current_level ?? rewardsData?.current_tier ?? 'Civic Observer';

  const handleQuickVerify = async (incidentId: number, feedbackType: 'confirmed_resolved' | 'problem_still_exists') => {
    try {
      await api.submitCitizenFeedback({
        incident_id: incidentId,
        feedback_type: feedbackType,
        comments: feedbackType === 'confirmed_resolved' ? 'Confirmed resolved via quick dashboard review.' : 'Problem still exists.'
      });
      setQuickVerifySuccess(`Feedback recorded! +3 Civic Points credited.`);
      setPendingVerifications((prev) => prev.filter((i) => i.id !== incidentId));
      setTimeout(() => setQuickVerifySuccess(null), 4000);
    } catch (e: any) {
      alert("Verification failed: " + (e.response?.data?.detail || e.message));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">RESOLVED</span>;
      case 'awaiting_verification':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">AWAITING VERIFY</span>;
      case 'in_progress':
      case 'assigned':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">IN PROGRESS</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">SUBMITTED</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-[#0F766E] to-teal-700 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-900/60 text-teal-100 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Citizen Portal • Chandigarh UT
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.full_name || 'Citizen'}!
          </h1>
          <p className="text-xs text-teal-100/90 leading-relaxed">
            Track your civic reports, reverify completed repairs in your neighborhood, and earn rewards for building a cleaner, safer Chandigarh.
          </p>
          <div className="flex items-center gap-4 pt-1 text-xs text-teal-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-300" />
              Resident of {user?.sector || 'Sector 22, Chandigarh'}
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              {userLevel}
            </span>
          </div>
        </div>

        {/* Quick Points & Report Trigger */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-lg border border-white/20 text-right">
            <span className="text-[10px] uppercase font-bold text-teal-200 block">Civic Points Balance</span>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-2xl font-black text-white">{userPoints}</span>
              <span className="text-xs text-amber-300 font-bold">PTS</span>
            </div>
            <span className="text-[10px] text-teal-200/80">Next tier at 250 pts</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#1A1D20] text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Report New Issue
            </button>
            <button
              onClick={() => navigate('/rewards')}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg border border-white/20 transition-colors"
            >
              My Badges
            </button>
          </div>
        </div>
      </div>

      {/* Citizen Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/my-reports')}
          className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-2xs hover:border-teal-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>My Active Reports</span>
            <Clock className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D20]">{activeReportsCount}</p>
          <span className="text-[10px] text-teal-700 font-medium flex items-center gap-1 mt-1">
            Track status & progress <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div
          onClick={() => navigate('/my-reports')}
          className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-2xs hover:border-emerald-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Resolved For You</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{resolvedReportsCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            Verified municipal fixes
          </span>
        </div>

        <div
          onClick={() => navigate('/verify')}
          className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span>Reverifications</span>
            <ShieldCheck className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-amber-800">{pendingVerifications.length}</p>
          <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-1">
            Earn +3 pts each <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div
          onClick={() => navigate('/rewards')}
          className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-2xs hover:border-purple-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-1">
            <span>Community Tier</span>
            <Award className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-lg font-bold text-purple-900 truncate">{userLevel}</p>
          <span className="text-[10px] text-purple-700 font-medium flex items-center gap-1 mt-1">
            Leaderboard & Badges <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Community Reverification Banner Callout */}
      {pendingVerifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Action Needed: {pendingVerifications.length} Municipal Repairs Awaiting Community Confirmation
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Field crews submitted proof of work in Chandigarh. Inspect before & after photos and confirm if the issue is resolved to earn <strong className="text-amber-950">+3 Civic Points</strong>!
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/verify')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 flex-shrink-0 shadow-xs transition-colors"
          >
            Review & Verify Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {quickVerifySuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {quickVerifySuccess}
        </div>
      )}

      {/* Main Grid: My Reports & Quick Community Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: My Tracked Reports (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F5] mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1A1D20] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F766E]" />
                  My Tracked Complaints
                </h2>
                <p className="text-xs text-[#6C757D]">
                  Live updates on issues you submitted to Chandigarh Municipal Corporation
                </p>
              </div>
              <button
                onClick={() => navigate('/my-reports')}
                className="text-xs text-[#0F766E] hover:underline font-semibold flex items-center gap-1"
              >
                View All ({myIncidents.length})
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading your complaints...</div>
            ) : myIncidents.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-600">You haven't reported any civic issues yet.</p>
                <button
                  onClick={() => navigate('/report')}
                  className="px-3 py-1.5 bg-[#0F766E] text-white text-xs font-semibold rounded-md"
                >
                  Report First Issue (+10 pts)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myIncidents.slice(0, 3).map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-lg border border-[#E5E7EB] hover:border-gray-300 bg-white shadow-2xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-gray-900">#{inc.incident_number}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-gray-100 text-gray-700 uppercase">
                          {inc.category.replace('_', ' ')}
                        </span>
                      </div>
                      {getStatusBadge(inc.status)}
                    </div>
                    <p className="text-xs font-medium text-gray-900 line-clamp-1">{inc.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {inc.location.sector} • {inc.location.landmark || 'Identified Landmark'}
                      </span>
                      <span>
                        Priority Score: <strong className="text-teal-800">{Math.round(inc.priority_override ?? inc.priority_score)}/100</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Neighborhood Civic Map for Citizens */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1A1D20] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0F766E]" />
                  Chandigarh Neighborhood Watch Map
                </h2>
                <p className="text-xs text-[#6C757D]">
                  Civic issues reported across sectors in Chandigarh
                </p>
              </div>
              <button
                onClick={() => navigate('/neighborhood-map')}
                className="text-xs text-[#0F766E] hover:underline font-semibold flex items-center gap-1"
              >
                Expand Map
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <IncidentMap
              incidents={allIncidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              selectedIncidentId={selectedIncident?.id}
              height="300px"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
              <span>● Red: Critical life-safety • Amber: High priority • Teal: Monitored</span>
              <span>Showing {allIncidents.length} active neighborhood issues</span>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Community Reverification & Rewards (1 Col) */}
        <div className="space-y-4">
          {/* Quick Community Reverification Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5]">
              <h2 className="text-sm font-bold text-[#1A1D20] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Community Reverification
              </h2>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                +3 pts / check
              </span>
            </div>

            <p className="text-xs text-gray-600">
              Citizens verify whether municipal field repairs truly solved the issue.
            </p>

            {pendingVerifications.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                All municipal fixes currently confirmed!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingVerifications.slice(0, 2).map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-lg border border-teal-100 bg-teal-50/30 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono text-gray-900">#{inc.incident_number}</span>
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                        AWAITING VERIFY
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 line-clamp-1">{inc.title}</p>
                    <p className="text-[11px] text-gray-500">{inc.location.sector} • {inc.location.landmark}</p>

                    <div className="pt-2 border-t border-teal-100/60 flex items-center gap-2">
                      <button
                        onClick={() => handleQuickVerify(inc.id, 'confirmed_resolved')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Resolved
                      </button>
                      <button
                        onClick={() => handleQuickVerify(inc.id, 'problem_still_exists')}
                        className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <ThumbsDown className="w-3 h-3" />
                        Still Broken
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/verify')}
                  className="w-full py-2 border border-[#E5E7EB] hover:bg-gray-50 rounded-lg text-xs font-semibold text-[#0F766E] flex items-center justify-center gap-1 transition-colors"
                >
                  Open Full Reverification Portal ({pendingVerifications.length})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Rewards Snapshot */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl border border-amber-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                Citizen Champion Rewards
              </h2>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Tier: {userLevel}
              </span>
            </div>

            <p className="text-xs text-amber-900/80 leading-relaxed">
              Every genuine report, photo evidence, and community reverification awards verified points in your immutable civic ledger.
            </p>

            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-amber-200 text-xs space-y-1.5">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Valid Civic Report</span>
                <span className="font-bold text-teal-700">+10 pts</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Photographic Evidence</span>
                <span className="font-bold text-teal-700">+5 pts</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Community Reverification</span>
                <span className="font-bold text-teal-700">+3 pts</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Verified Resolution Bonus</span>
                <span className="font-bold text-teal-700">+15 pts</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/rewards')}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              View Points Ledger & Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
