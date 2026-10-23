import axios from 'axios';
import {
  Incident, GraphData, RiskAssessment,
  InterventionPlan, CivicEquityOverview, LeaderboardEntry,
  BadgeItem, WorkAssignment, ResolutionSubmission,
  NotificationItem, User, CitizenFeedback, ReportExtraction
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;

// Resolves backend-relative upload paths (/uploads/...) to absolute URLs; leaves external URLs untouched.
export const mediaUrl = (path?: string): string => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '') + path;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('civicpulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A rejected token (expired, or the server's SECRET_KEY changed) can't recover on its own:
// drop it and reload so the app signs in again instead of failing every request.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/login') && localStorage.getItem('civicpulse_token')) {
      localStorage.removeItem('civicpulse_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const api = {
  // Auth
  login: async (credentials: any) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  getDemoAccounts: async () => {
    const res = await apiClient.get('/auth/demo-accounts');
    return res.data;
  },

  // Incidents
  getIncidents: async (params?: any): Promise<Incident[]> => {
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },
  getMyIncidents: async (): Promise<Incident[]> => {
    const res = await apiClient.get('/incidents/my');
    return res.data;
  },
  getIncidentDetail: async (id: number): Promise<Incident> => {
    const res = await apiClient.get(`/incidents/${id}`);
    return res.data;
  },
  submitReport: async (data: any): Promise<Incident> => {
    const res = await apiClient.post('/incidents/report', data);
    return res.data;
  },
  extractReport: async (text: string): Promise<ReportExtraction> => {
    const res = await apiClient.post('/incidents/extract', { text });
    return res.data;
  },
  uploadEvidence: async (incidentId: number, formData: FormData) => {
    const res = await apiClient.post(`/incidents/${incidentId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  overridePriority: async (incidentId: number, data: { priority_override: number; override_reason: string }): Promise<Incident> => {
    const res = await apiClient.patch(`/incidents/${incidentId}/priority-override`, data);
    return res.data;
  },
  updateStatus: async (incidentId: number, data: { status: string; notes?: string }): Promise<Incident> => {
    const res = await apiClient.patch(`/incidents/${incidentId}/status`, data);
    return res.data;
  },

  // Incident Graph
  getGraphTopology: async (params?: any): Promise<GraphData> => {
    const res = await apiClient.get('/graph/topology', { params });
    return res.data;
  },

  // Ripple Intelligence
  getWeatherScenarios: async (): Promise<any[]> => {
    const res = await apiClient.get('/ripple/scenarios');
    return res.data;
  },
  assessRippleRisks: async (scenarioName: string, sectorFilter?: string): Promise<RiskAssessment[]> => {
    const res = await apiClient.post('/ripple/assess', {
      scenario_name: scenarioName,
      sector_filter: sectorFilter === 'all' ? undefined : sectorFilter
    });
    return res.data;
  },

  // Intervention Simulator
  simulateIntervention: async (data: {
    available_crews: number;
    budget_inr: number;
    time_hours: number;
    weather_scenario: string;
  }): Promise<InterventionPlan> => {
    const res = await apiClient.post('/intervention/simulate', data);
    return res.data;
  },

  // Resolution & Verification
  getAssignments: async (status?: string): Promise<WorkAssignment[]> => {
    const res = await apiClient.get('/resolution/assignments', { params: { status } });
    return res.data;
  },
  updateAssignmentStatus: async (assignmentId: number, data: { status: string; notes?: string }): Promise<WorkAssignment> => {
    const res = await apiClient.patch(`/resolution/assignments/${assignmentId}/status`, data);
    return res.data;
  },
  uploadResolutionPhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/resolution/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.path;
  },
  submitResolution: async (data: any): Promise<ResolutionSubmission> => {
    const res = await apiClient.post('/resolution/submit', data);
    return res.data;
  },
  submitCitizenFeedback: async (data: {
    incident_id: number;
    feedback_type: string;
    comments?: string;
  }) => {
    const res = await apiClient.post('/resolution/feedback', data);
    return res.data;
  },
  getIncidentFeedback: async (incidentId: number): Promise<CitizenFeedback[]> => {
    const res = await apiClient.get(`/resolution/feedback/${incidentId}`);
    return res.data;
  },
  getMyReverifiedIds: async (): Promise<number[]> => {
    const res = await apiClient.get('/resolution/my-feedback');
    return res.data;
  },
  getSubmissions: async (incidentId: number): Promise<ResolutionSubmission[]> => {
    const res = await apiClient.get(`/resolution/submissions/${incidentId}`);
    return res.data;
  },

  // Civic Equity
  getEquityOverview: async (): Promise<CivicEquityOverview> => {
    const res = await apiClient.get('/equity/overview');
    return res.data;
  },

  // Rewards
  getRewardsDashboard: async () => {
    const res = await apiClient.get('/rewards/dashboard');
    return res.data;
  },
  getLeaderboard: async (limit = 20): Promise<LeaderboardEntry[]> => {
    const res = await apiClient.get('/rewards/leaderboard', { params: { limit } });
    return res.data;
  },
  getBadges: async (): Promise<BadgeItem[]> => {
    const res = await apiClient.get('/rewards/badges');
    return res.data;
  },
  togglePrivacy: async () => {
    const res = await apiClient.post('/rewards/toggle-privacy');
    return res.data;
  },

  // Admin
  getDashboardStats: async () => {
    const res = await apiClient.get('/admin/dashboard-stats');
    return res.data;
  },
  assignWork: async (data: {
    incident_id: number;
    worker_id: number;
    priority: string;
    estimated_hours: number;
    notes?: string;
  }): Promise<WorkAssignment> => {
    const res = await apiClient.post('/admin/assign', data);
    return res.data;
  },
  getAuditLogs: async (limit = 50) => {
    const res = await apiClient.get('/admin/audit-logs', { params: { limit } });
    return res.data;
  },
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await apiClient.get('/admin/notifications');
    return res.data;
  },
  markNotificationRead: async (id: number) => {
    const res = await apiClient.patch(`/admin/notifications/${id}/read`);
    return res.data;
  },
  resetSeedData: async () => {
    const res = await apiClient.post('/admin/reset-seed');
    return res.data;
  }
};
