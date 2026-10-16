from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from app.models import UserRole, IncidentStatus, IncidentCategory

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CITIZEN
    sector: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class CitizenProfileOut(BaseModel):
    id: int
    display_name: str
    anonymous_pref: bool
    total_points: int
    current_level: str

    class Config:
        from_attributes = True

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    profile: Optional[CitizenProfileOut] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LocationBase(BaseModel):
    sector: str
    landmark: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    is_gps_verified: bool = False

class LocationCreate(LocationBase):
    pass

class LocationOut(LocationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class EvidenceOut(BaseModel):
    id: int
    file_path: str
    file_type: str
    file_size: int
    caption: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    title: Optional[str] = None
    description: str
    category: Optional[IncidentCategory] = None
    language: str = "en" # en, hi, pa
    sector: str
    landmark: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    is_gps_verified: bool = False
    anonymous_public: bool = False

class PriorityFactorBreakdown(BaseModel):
    impact_score: float
    urgency_score: float
    recurrence_boost: float
    duration_weight: float
    evidence_weight: float
    final_score: float
    explanation: str

class IncidentOut(BaseModel):
    id: int
    incident_number: str
    user_id: int
    title: str
    description: str
    category: IncidentCategory
    subcategory: Optional[str] = None
    language: str
    urgency: str
    impact: str
    recurrence_count: int
    priority_score: float
    priority_override: Optional[float] = None
    override_reason: Optional[str] = None
    status: IncidentStatus
    evidence_confidence: float
    ai_extraction_meta: Optional[Dict[str, Any]] = None
    location: LocationOut
    evidence: List[EvidenceOut] = []
    reporter_name: Optional[str] = None
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IncidentPriorityOverride(BaseModel):
    priority_override: float = Field(..., ge=0.0, le=100.0)
    override_reason: str = Field(..., min_length=5)

class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    notes: Optional[str] = None

class WorkAssignmentCreate(BaseModel):
    incident_id: int
    worker_id: int
    priority: str = "medium"
    estimated_hours: float = 4.0
    notes: Optional[str] = None

class WorkAssignmentOut(BaseModel):
    id: int
    incident_id: int
    worker_id: int
    assigned_by: int
    priority: str
    estimated_hours: float
    status: str
    notes: Optional[str] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    incident: Optional[IncidentOut] = None

    class Config:
        from_attributes = True

class ResolutionSubmissionCreate(BaseModel):
    incident_id: int
    assignment_id: Optional[int] = None
    resolution_notes: str
    before_photo_path: Optional[str] = None
    after_photo_path: str

class ResolutionSubmissionOut(BaseModel):
    id: int
    incident_id: int
    worker_id: int
    before_photo_path: Optional[str] = None
    after_photo_path: str
    resolution_notes: str
    validation_status: str
    validation_notes: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True

class CitizenFeedbackCreate(BaseModel):
    incident_id: int
    feedback_type: str # confirmed_resolved, problem_still_exists, unable_to_verify
    comments: Optional[str] = None

class CitizenFeedbackOut(BaseModel):
    id: int
    incident_id: int
    user_id: int
    feedback_type: str
    comments: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    incident_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class GraphNode(BaseModel):
    id: str
    label: str
    type: str # incident, cluster, infrastructure, sector
    category: Optional[str] = None
    status: Optional[str] = None
    sector: Optional[str] = None
    priority: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str # duplicate, recurring_pattern, downstream_risk, infrastructure_adjacent, member_of
    confidence: float
    explanation: str

class GraphDataOut(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: Dict[str, Any]

class RippleScenarioRequest(BaseModel):
    scenario_name: str = "moderate_rain" # dry_weather, moderate_rain, heavy_monsoon
    sector_filter: Optional[str] = None

class RiskAssessmentOut(BaseModel):
    id: int
    scenario_name: str
    risk_type: str
    sector: str
    severity: str
    score: float
    supporting_evidence: Optional[List[str]] = None
    assumptions: Optional[List[str]] = None
    missing_information: Optional[str] = None
    recommended_action: str
    incident_ids: Optional[List[int]] = None
    infrastructure_name: Optional[str] = None
    is_simulated: bool
    created_at: datetime

    class Config:
        from_attributes = True

class InterventionRequest(BaseModel):
    available_crews: int = Field(2, ge=1, le=10)
    budget_inr: float = Field(250000.0, ge=10000.0)
    time_hours: float = Field(48.0, ge=4.0)
    weather_scenario: str = "moderate_rain"

class RecommendedActionItem(BaseModel):
    incident_id: int
    incident_number: str
    title: str
    sector: str
    category: str
    assigned_crew: str
    required_skills: List[str]
    estimated_cost_inr: float
    estimated_hours: float
    priority_score: float
    risk_mitigated: str
    rationale: str
    related_incident_count: int

class InterventionPlanOut(BaseModel):
    id: Optional[int] = None
    plan_name: str
    available_crews: int
    budget_inr: float
    time_hours: float
    weather_scenario: str
    total_estimated_cost: float
    total_estimated_hours: float
    incidents_addressed_count: int
    recommended_actions: List[RecommendedActionItem]
    alternative_plans: Optional[List[Dict[str, Any]]] = None
    residual_risks: Optional[List[str]] = None
    assumptions: Optional[List[str]] = None

class EquitySectorMetric(BaseModel):
    sector: str
    total_reported: int
    unresolved_count: int
    recurring_hotspots_count: int
    avg_resolution_hours: float
    severe_unresolved_count: int
    infrastructure_vulnerabilities: int
    equity_score: float # 0 to 100, higher = more neglected/needs intervention
    flagged_for_review: bool
    flag_reasons: List[str]
    last_inspection_days_ago: int

class CivicEquityOverviewOut(BaseModel):
    sectors: List[EquitySectorMetric]
    city_avg_resolution_hours: float
    highest_neglect_sector: str
    total_flagged_sectors: int
    summary_notes: str

class PointsLedgerOut(BaseModel):
    id: int
    points: int
    reason_code: str
    description: str
    reference_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BadgeOut(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    points_threshold: int
    is_earned: bool = False
    awarded_at: Optional[datetime] = None

class LeaderboardEntryOut(BaseModel):
    rank: int
    user_id: int
    display_name: str
    sector: Optional[str] = None
    total_points: int
    level: str
    verified_reports_count: int
    confirmed_resolutions_count: int
    badges_count: int

class MemoryRecordOut(BaseModel):
    id: int
    incident_id: int
    sector: str
    category: str
    recurring_interval_days: Optional[float] = None
    past_resolution_count: int
    failure_mode_notes: Optional[str] = None
    recommended_infrastructure_inspection: bool
    created_at: datetime

    class Config:
        from_attributes = True
