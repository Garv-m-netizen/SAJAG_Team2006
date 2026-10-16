import React, { useState } from 'react';
import { Bell, Users, Check, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const TopBar: React.FC<{ title?: string; subtitle?: string }> = ({
  title = "Dashboard",
  subtitle = "Municipal Civic Intelligence & Operations"
}) => {
  const { user, quickLogin, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const navigate = useNavigate();

  const demoPersonas = [
    {
      name: "Dr. Rajesh Sharma",
      role: "admin",
      label: "Admin (Municipal Commissioner)",
      email: "admin@civicpulse.chandigarh.gov.in",
      pass: "Admin@123",
      badgeClass: "bg-purple-100 text-purple-800"
    },
    {
      name: "Vikram Singh",
      role: "field_worker",
      label: "Field Worker (Sanitation & Drainage)",
      email: "worker1@civicpulse.chandigarh.gov.in",
      pass: "Worker@123",
      badgeClass: "bg-amber-100 text-amber-800"
    },
    {
      name: "Sunil Kumar",
      role: "field_worker",
      label: "Field Worker (Roads & Illumination)",
      email: "worker2@civicpulse.chandigarh.gov.in",
      pass: "Worker@123",
      badgeClass: "bg-amber-100 text-amber-800"
    },
    {
      name: "Garv Sharma",
      role: "citizen",
      label: "Citizen (Sector 22 Resident)",
      email: "citizen1@chandigarh.org",
      pass: "Citizen@123",
      badgeClass: "bg-teal-100 text-teal-800"
    },
    {
      name: "Simran Kaur",
      role: "citizen",
      label: "Citizen (Sector 17 Resident)",
      email: "citizen2@chandigarh.org",
      pass: "Citizen@123",
      badgeClass: "bg-teal-100 text-teal-800"
    }
  ];

  const handleSwitchPersona = async (email: string, pass: string) => {
    setShowDemoMenu(false);
    await quickLogin(email, pass);
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      <div>
        <h2 className="text-lg font-semibold text-[#1A1D20] leading-tight">{title}</h2>
        <p className="text-xs text-[#6C757D]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Demonstration Mode indicator */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Chandigarh Sandbox Live
        </span>

        {/* Demo Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => { setShowDemoMenu(!showDemoMenu); setShowNotifMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#374151] bg-[#F8F9FA] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-md transition-colors"
            title="Switch Demo Persona"
          >
            <Users className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="hidden md:inline">Switch Persona:</span>
            <span className="font-semibold text-[#0F766E] truncate max-w-[120px]">
              {user?.full_name?.split(' ')[0] || 'Select'}
            </span>
          </button>

          {showDemoMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#E5E7EB] p-2 z-50">
              <div className="px-2 py-1.5 border-b border-[#F1F3F5] mb-1">
                <p className="text-xs font-semibold text-[#111827]">Demo Evaluator Accounts</p>
                <p className="text-[10px] text-[#6B7280]">Instant role toggle for hackathon testing</p>
              </div>
              <div className="space-y-1">
                {demoPersonas.map((p) => {
                  const isActive = user?.email === p.email;
                  return (
                    <button
                      key={p.email}
                      onClick={() => handleSwitchPersona(p.email, p.pass)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                        isActive ? 'bg-[#F0FDFA] font-medium' : 'hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${p.badgeClass}`}>
                            {p.role.replace('_', ' ')}
                          </span>
                          <span className="text-[#1F2937] font-medium truncate">{p.name}</span>
                        </div>
                        <p className="text-[10px] text-[#6B7280] truncate">{p.label}</p>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-[#0F766E] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#F1F3F5] text-right">
                <button
                  onClick={logout}
                  className="text-[11px] text-red-600 hover:text-red-700 font-medium px-2 py-0.5"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifMenu(!showNotifMenu); setShowDemoMenu(false); }}
            className="relative p-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#E5E7EB] p-2 z-50">
              <div className="px-2 py-1.5 border-b border-[#F1F3F5] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111827]">In-App Notifications</span>
                <span className="text-[11px] text-[#6B7280]">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F3F5] mt-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] text-center py-4">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.notification_type === 'reverification') navigate('/resolution');
                      }}
                      className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                        n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-teal-50/50 hover:bg-teal-50'
                      }`}
                    >
                      <p className="font-semibold text-[#1F2937] flex items-center justify-between">
                        <span>{n.title}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>}
                      </p>
                      <p className="text-[11px] text-[#4B5563] mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[9px] text-[#9CA3AF] mt-1 block">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
