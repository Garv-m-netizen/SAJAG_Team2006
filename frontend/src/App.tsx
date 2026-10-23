import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';

import { Overview } from './pages/Overview';
import { ReportIssue } from './pages/ReportIssue';
import { MyReports } from './pages/MyReports';
import { IncidentGraphPage } from './pages/IncidentGraphPage';
import { RippleIntelligence } from './pages/RippleIntelligence';
import { InterventionSimulator } from './pages/InterventionSimulator';
import { ResolutionCenter } from './pages/ResolutionCenter';
import { CivicEquity } from './pages/CivicEquity';
import { ChampionRewards } from './pages/ChampionRewards';
import { AdminSettings } from './pages/AdminSettings';
import { Login } from './pages/Login';

// Role-tailored pages
import { CitizenReverification } from './pages/CitizenReverification';
import { NeighborhoodMapPage } from './pages/NeighborhoodMapPage';
import { WorkerTasksPage } from './pages/WorkerTasksPage';
import { WorkerMapPage } from './pages/WorkerMapPage';
import { WorkerHistoryPage } from './pages/WorkerHistoryPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  const getPageMeta = () => {
    const path = location.pathname;

    if (user?.role === 'citizen') {
      if (path === '/') return { title: 'Citizen Hub', subtitle: 'Personal complaints tracker, neighborhood watch, and rewards' };
      if (path === '/verify') return { title: 'Community Reverification', subtitle: 'Inspect municipal field repairs and earn +3 civic points' };
      if (path === '/neighborhood-map') return { title: 'Neighborhood Watch Map', subtitle: 'Explore reported issues and verified fixes across Chandigarh sectors' };
      if (path === '/report') return { title: 'Report an Issue', subtitle: 'Multilingual reporting in Hindi, Punjabi, and English' };
      if (path === '/my-reports') return { title: 'My Tracked Complaints', subtitle: 'Track your submitted complaints and verification outcomes' };
      if (path === '/rewards') return { title: 'Civic Champion Rewards', subtitle: 'Recognizing community contributions with an auditable points ledger' };
    }

    if (user?.role === 'field_worker') {
      if (path === '/') return { title: 'Field Operations Duty Board', subtitle: 'Tactical work orders, status transitions, and proof upload' };
      if (path === '/worker-tasks') return { title: 'My Assigned Work Orders', subtitle: 'Execute field repairs and submit before/after photographic proof' };
      if (path === '/worker-map') return { title: 'Field Route & Sector Map', subtitle: 'Geographic navigation for your assigned municipal jobs' };
      if (path === '/worker-history') return { title: 'Completed Work History', subtitle: 'Submitted proofs and citizen verification reviews' };
    }

    // Default / Admin
    const ADMIN_PAGE_METADATA: Record<string, { title: string; subtitle: string }> = {
      '/': { title: 'Operations Overview', subtitle: 'Live incident triage, spatial distribution, and resolution stats' },
      '/report': { title: 'Report an Issue', subtitle: 'Multilingual reporting in Hindi, Punjabi, and English' },
      '/my-reports': { title: 'My Incident Reports', subtitle: 'Track your submitted complaints and verification outcomes' },
      '/graph': { title: 'Civic Incident Graph', subtitle: 'NetworkX topological intelligence connecting related issues and assets' },
      '/ripple': { title: 'Civic Ripple Intelligence', subtitle: 'Anticipate downstream cascading risks under weather simulations' },
      '/intervention': { title: 'Intervention Simulator', subtitle: 'Constrained municipal resource optimization and crew scheduling' },
      '/resolution': { title: 'Resolution & Audit Center', subtitle: 'Supervisory review of worker evidence and citizen disputes' },
      '/equity': { title: 'Civic Equity Analysis', subtitle: 'Detect underserved neighborhoods and monitor resolution delays' },
      '/rewards': { title: 'Civic Champion Rewards', subtitle: 'Recognizing community contributions with an auditable points ledger' },
      '/admin': { title: 'Administrator Console', subtitle: 'Priority overrides, worker dispatching, and system audit trail' },
      '/verify': { title: 'Community Reverification', subtitle: 'Citizen verification feedback and dispute audit' },
      '/neighborhood-map': { title: 'Chandigarh Civic GIS Map', subtitle: 'Spatial incident distribution and sector indicators' },
      '/worker-tasks': { title: 'Field Crew Work Orders', subtitle: 'Dispatched municipal assignments' },
      '/worker-map': { title: 'Field Route Map', subtitle: 'Crew navigation and sector task locations' },
      '/worker-history': { title: 'Field Work History', subtitle: 'Completed orders and verification ledger' },
    };

    return ADMIN_PAGE_METADATA[path] || { title: 'Sajag AI', subtitle: 'Chandigarh UT Operations' };
  };

  const meta = getPageMeta();

  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex text-[#1A1D20]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 min-w-0">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/report" element={<ReportIssue />} />
              <Route path="/my-reports" element={<MyReports />} />
              <Route path="/graph" element={<IncidentGraphPage />} />
              <Route path="/ripple" element={<RippleIntelligence />} />
              <Route path="/intervention" element={<InterventionSimulator />} />
              <Route path="/resolution" element={<ResolutionCenter />} />
              <Route path="/equity" element={<CivicEquity />} />
              <Route path="/rewards" element={<ChampionRewards />} />
              <Route path="/admin" element={<AdminSettings />} />
              <Route path="/login" element={<Login />} />

              {/* Role-Specific Routes */}
              <Route path="/verify" element={<CitizenReverification />} />
              <Route path="/neighborhood-map" element={<NeighborhoodMapPage />} />
              <Route path="/worker-tasks" element={<WorkerTasksPage />} />
              <Route path="/worker-map" element={<WorkerMapPage />} />
              <Route path="/worker-history" element={<WorkerHistoryPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
