export type UserRole = 'citizen' | 'field_worker' | 'admin';

export type IncidentCategory =
  | 'garbage_sanitation'
  | 'drainage_waterlogging'
  | 'potholes_roads'
  | 'broken_streetlights'
  | 'water_supply'
  | 'infrastructure_damage'
  | 'traffic_safety'
  | 'other';

export type IncidentStatus =
  | 'reported'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolution_submitted'
  | 'awaiting_verification'
  | 'resolved'
  | 'reopened'
  | 'rejected'
  | 'duplicate'
  | 'escalated';

export interface CitizenProfile {
  id: number;
  display_name: string;
  anonymous_pref: boolean;
  total_points: number;
  current_level: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  sector?: string;
  phone?: string;
  is_active: boolean;
  profile?: CitizenProfile;
}

export interface LocationData {
  id: number;
  sector: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  address?: string;
  is_gps_verified: boolean;
  created_at: string;
}

export interface Evidence {
  id: number;
  file_path: string;
  file_type: string;
  file_size: number;
  caption?: string;
  created_at: string;
}

export interface Incident {
  id: number;
  incident_number: string;
  user_id: number;
  title: string;
  description: string;
  category: IncidentCategory;
  subcategory?: string;
  language: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  recurrence_count: number;
  priority_score: number;
  priority_override?: number;
  override_reason?: string;
  status: IncidentStatus;
  evidence_confidence: number;
  ai_extraction_meta?: {
    nlp?: {
      inferred_category?: string;
      detected_language?: string;
      urgency?: string;
      confidence_score?: number;
      safety_concerns?: string[];
      location_clues?: string[];
      missing_info?: string[];
      matched_keywords?: string[];
    };
    priority_factors?: {
      urgency_component?: number;
      impact_component?: number;
      recurrence_boost?: number;
      duration_component?: number;
      evidence_component?: number;
    };
    priority_explanation?: string;
    duplicate_suggestions?: Array<{
      target_incident_id: number;
      target_incident_number: string;
      distance_meters: number;
      text_similarity: number;
      confidence: number;
      relationship_type: string;
      explanation: string;
    }>;
  };
  location: LocationData;
  evidence: Evidence[];
  reporter_name?: string;
  is_synthetic: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkAssignment {
  id: number;
  incident_id: number;
  worker_id: number;
  assigned_by: number;
  worker_name?: string;
  priority: string;
  estimated_hours: number;
  status: string;
  notes?: string;
  assigned_at: string;
  completed_at?: string;
  incident?: Incident;
}

export interface CitizenFeedback {
  id: number;
  incident_id: number;
  user_id: number;
  user_name?: string;
  feedback_type: 'confirmed_resolved' | 'problem_still_exists' | 'unable_to_verify';
  comments?: string;
  submitted_at: string;
}

export interface ReportExtraction {
  category: string;
  sector?: string | null;
  landmark?: string | null;
  urgency: string;
  language: string;
  provider: string;
}

export interface ResolutionSubmission {
  id: number;
  incident_id: number;
  worker_id: number;
  before_photo_path?: string;
  after_photo_path: string;
  resolution_notes: string;
  validation_status: 'valid' | 'flagged' | 'rejected' | 'pending';
  validation_notes?: string;
  submitted_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  incident_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'incident' | 'cluster' | 'infrastructure';
  category?: string;
  status?: string;
  sector?: string;
  priority?: number;
  latitude?: number;
  longitude?: number;
  metadata?: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  confidence: number;
  explanation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    connected_clusters: number;
    graph_density: number;
  };
}

export interface RiskAssessment {
  id: number;
  scenario_name: string;
  risk_type: string;
  sector: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  supporting_evidence?: string[];
  assumptions?: string[];
  missing_information?: string;
  recommended_action: string;
  incident_ids?: number[];
  infrastructure_name?: string;
  requires_inspection?: boolean;
  confidence_rating?: number;
  is_simulated: boolean;
  created_at: string;
}

export interface RecommendedAction {
  incident_id: number;
  incident_number: string;
  title: string;
  sector: string;
  category: string;
  assigned_crew: string;
  required_skills: string[];
  estimated_cost_inr: number;
  estimated_hours: number;
  priority_score: number;
  risk_mitigated: string;
  rationale: string;
  related_incident_count: number;
}

export interface InterventionPlan {
  plan_name: string;
  available_crews: number;
  budget_inr: number;
  time_hours: number;
  weather_scenario: string;
  total_estimated_cost: number;
  total_estimated_hours: number;
  incidents_addressed_count: number;
  recommended_actions: RecommendedAction[];
  alternative_plans?: Array<{
    plan_name: string;
    focus: string;
    recommended_incidents_count: number;
    estimated_cost_inr: number;
    rationale: string;
  }>;
  residual_risks?: string[];
  assumptions?: string[];
}

export interface EquitySectorMetric {
  sector: string;
  total_reported: number;
  unresolved_count: number;
  recurring_hotspots_count: number;
  avg_resolution_hours: number;
  severe_unresolved_count: number;
  infrastructure_vulnerabilities: number;
  equity_score: number;
  flagged_for_review: boolean;
  flag_reasons: string[];
  last_inspection_days_ago: number;
}

export interface CivicEquityOverview {
  sectors: EquitySectorMetric[];
  city_avg_resolution_hours: number;
  highest_neglect_sector: string;
  total_flagged_sectors: number;
  summary_notes: string;
}

export interface PointsLedgerEntry {
  id: number;
  points: number;
  reason_code: string;
  description: string;
  reference_id?: number;
  created_at: string;
}

export interface BadgeItem {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  points_threshold: number;
  is_earned: boolean;
  awarded_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  sector?: string;
  total_points: number;
  level: string;
  verified_reports_count: number;
  confirmed_resolutions_count: number;
  badges_count: number;
}
