import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Network,
  Activity,
  Sliders,
  CheckCircle,
  CheckCircle2,
  Scale,
  Award,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  HardHat,
  ClipboardList,
  Navigation,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoimg from '../../assets/logo_img.png';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const getNavItems = () => {
    if (user?.role === 'citizen') {
      return [
        { name: 'Citizen Hub', path: '/', icon: LayoutDashboard },
        { name: 'Report an Issue', path: '/report', icon: PlusCircle },
        { name: 'My Tracked Reports', path: '/my-reports', icon: FileText },
        { name: 'Community Reverification', path: '/verify', icon: ShieldCheck },
        { name: 'Champion Rewards', path: '/rewards', icon: Award },
        { name: 'Neighborhood Map', path: '/neighborhood-map', icon: MapPin },
      ];
    }

    if (user?.role === 'field_worker') {
      return [
        { name: 'Field Duty Board', path: '/', icon: HardHat },
        { name: 'My Work Orders', path: '/worker-tasks', icon: ClipboardList },
        { name: 'Task Route Map', path: '/worker-map', icon: Navigation },
        { name: 'Completed History', path: '/worker-history', icon: CheckCircle },
      ];
    }

    // Default: Municipal Administrator
    return [
      { name: 'Operations Command', path: '/', icon: LayoutDashboard },
      { name: 'Incident Triage & Dispatch', path: '/admin', icon: ShieldAlert },
      { name: 'Civic Incident Graph', path: '/graph', icon: Network },
      { name: 'Ripple Intelligence', path: '/ripple', icon: Activity },
      { name: 'Response Simulator', path: '/intervention', icon: Sliders },
      { name: 'Resolution & Disputes', path: '/resolution', icon: CheckCircle2 },
      { name: 'Civic Equity Analytics', path: '/equity', icon: Scale },
      { name: 'Audit Logs & Settings', path: '/admin', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          <Shield className="w-3 h-3" /> Municipal Officer
        </span>
      );
    }
    if (user.role === 'field_worker') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <HardHat className="w-3 h-3" /> Field Crew
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
        <UserIcon className="w-3 h-3" /> Citizen Reporter
      </span>
    );
  };

  const getPortalLabel = () => {
    if (user?.role === 'citizen') return 'Citizen Portal';
    if (user?.role === 'field_worker') return 'Field Crew Portal';
    return 'Municipal Command';
  };

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <img src={logoimg} alt="logo" className="w-full h-full object-cover " />
          </div>
          <div>
            <h1 className="font-semibold text-base text-[#1A1D20] tracking-tight leading-none">
              सजग AI
            </h1>
            <span className="text-[11px] text-[#6C757D] font-normal">{getPortalLabel()}</span>
          </div>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex items-center justify-between">
        <span className="text-xs text-[#6C757D]">Active Role</span>
        {getRoleBadge()}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1] shadow-xs font-semibold'
                    : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${
              user?.role === 'admin'
                ? 'bg-purple-100 text-purple-800'
                : user?.role === 'field_worker'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-teal-100 text-teal-800'
            }`}>
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#1A1D20] truncate">{user?.full_name || 'Guest User'}</p>
              <p className="text-[10px] text-[#6C757D] truncate">
                {user?.role === 'field_worker'
                  ? (user.email.includes('worker1') ? 'Sanitation & Drainage' : 'Roads & Lighting')
                  : user?.role === 'admin'
                  ? 'Municipal HQ'
                  : (user?.sector || 'Chandigarh')}
              </p>
            </div>
          </div>
          {user?.role === 'citizen' && (
            <div className="text-right flex-shrink-0">
              <span className="text-[11px] font-bold text-[#0F766E] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                {user.profile?.total_points ?? 186} pts
              </span>
            </div>
          )}
          {user?.role === 'field_worker' && (
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Shift ON
              </span>
            </div>
          )}
          {user?.role === 'admin' && (
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                Officer
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
