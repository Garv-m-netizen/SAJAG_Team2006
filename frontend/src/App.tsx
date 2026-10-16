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

const PAGE_METADATA: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Operations Overview', subtitle: 'Live incident triage, spatial distribution, and resolution stats' },
  '/report': { title: 'Report an Issue', subtitle: 'Multilingual reporting in Hindi, Punjabi, and English' },
  '/my-reports': { title: 'My Incident Reports', subtitle: 'Track your submitted complaints and verification outcomes' },
  '/graph': { title: 'Civic Incident Graph', subtitle: 'NetworkX topological intelligence connecting related issues and assets' },
  '/ripple': { title: 'Civic Ripple Intelligence', subtitle: 'Anticipate downstream cascading risks under weather simulations' },
  '/intervention': { title: 'Intervention Simulator', subtitle: 'Constrained municipal resource optimization and crew scheduling' },
  '/resolution': { title: 'Resolution Center', subtitle: 'Field proof submissions and citizen community reverification' },
  '/equity': { title: 'Civic Equity Analysis', subtitle: 'Detect underserved neighborhoods and monitor resolution delays' },
  '/rewards': { title: 'Civic Champion Rewards', subtitle: 'Recognizing community contributions with an auditable points ledger' },
  '/admin': { title: 'Administrator Console', subtitle: 'Priority overrides, worker dispatching, and system audit trail' },
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const meta = PAGE_METADATA[location.pathname] || { title: 'CivicPulse AI', subtitle: 'Chandigarh UT Operations' };

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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
