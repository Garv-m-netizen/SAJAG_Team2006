import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SQLEnum, Index, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    FIELD_WORKER = "field_worker"
    ADMIN = "admin"

class IncidentStatus(str, enum.Enum):
    REPORTED = "reported"
    UNDER_REVIEW = "under_review"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLUTION_SUBMITTED = "resolution_submitted"
    AWAITING_VERIFICATION = "awaiting_verification"
    RESOLVED = "resolved"
    REOPENED = "reopened"
    REJECTED = "rejected"
    DUPLICATE = "duplicate"
    ESCALATED = "escalated"

class IncidentCategory(str, enum.Enum):
    GARBAGE = "garbage_sanitation"
    DRAINAGE = "drainage_waterlogging"
    POTHOLES = "potholes_roads"
    STREETLIGHTS = "broken_streetlights"
    WATER_SUPPLY = "water_supply"
    INFRASTRUCTURE = "infrastructure_damage"
    TRAFFIC_SAFETY = "traffic_safety"
    OTHER = "other"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.CITIZEN, nullable=False)
    sector = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("CitizenProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="reporter", foreign_keys="Incident.user_id")
    assignments = relationship("WorkAssignment", back_populates="worker", foreign_keys="WorkAssignment.worker_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    ledger_entries = relationship("PointsLedger", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")

class CitizenProfile(Base):
    __tablename__ = "citizen_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    anonymous_pref = Column(Boolean, default=False)
    total_points = Column(Integer, default=0)
    current_level = Column(String(50), default="Civic Observer")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="profile")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    sector = Column(String(50), nullable=False, index=True)
    landmark = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    is_gps_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class InfrastructureAsset(Base):
    __tablename__ = "infrastructure_assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_type = Column(String(100), nullable=False) # e.g. "underpass", "stormwater_culvert", "water_main", "transformer"
    name = Column(String(255), nullable=False)
    sector = Column(String(50), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    vulnerability_rating = Column(Float, default=0.5) # 0.0 to 1.0
    last_inspected_at = Column(DateTime, nullable=True)
    criticality = Column(String(50), default="medium") # low, medium, high, critical
    notes = Column(Text, nullable=True)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    raw_text = Column(Text, nullable=True)
    category = Column(SQLEnum(IncidentCategory), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True)
    language = Column(String(20), default="en") # en, hi, pa
    urgency = Column(String(20), default="medium") # low, medium, high, critical
    impact = Column(String(20), default="medium") # low, medium, high
    recurrence_count = Column(Integer, default=1)
    priority_score = Column(Float, default=50.0) # 0 to 100
    priority_override = Column(Float, nullable=True)
    override_reason = Column(Text, nullable=True)
    override_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.REPORTED, nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    evidence_confidence = Column(Float, default=0.7) # 0.0 to 1.0
    ai_extraction_meta = Column(JSON, nullable=True) # transparent extraction outputs
    cluster_id = Column(Integer, ForeignKey("incident_clusters.id"), nullable=True)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", back_populates="incidents", foreign_keys=[user_id])
    location = relationship("Location")
    cluster = relationship("IncidentCluster", back_populates="incidents")
    evidence = relationship("IncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    assignments = relationship("WorkAssignment", back_populates="incident")
    resolution_submissions = relationship("ResolutionSubmission", back_populates="incident")
    feedback = relationship("CitizenResolutionFeedback", back_populates="incident")
    memory_records = relationship("CivicIntelligenceMemory", back_populates="incident")

class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # image/jpeg, image/png, audio/webm, etc.
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=True)
    caption = Column(String(255), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="evidence")

class IncidentCluster(Base):
    __tablename__ = "incident_clusters"

    id = Column(Integer, primary_key=True, index=True)
    cluster_name = Column(String(255), nullable=False)
    sector = Column(String(50), nullable=False, index=True)
    category = Column(SQLEnum(IncidentCategory), nullable=False)
    canonical_incident_id = Column(Integer, nullable=True)
    status = Column(String(50), default="active")
    recurring_count = Column(Integer, default=1)
    first_reported_at = Column(DateTime, default=datetime.utcnow)
    last_reported_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    incidents = relationship("Incident", back_populates="cluster")

class IncidentRelationship(Base):
    __tablename__ = "incident_relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    target_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    relationship_type = Column(String(50), nullable=False) # duplicate, recurring_pattern, downstream_risk, infrastructure_adjacent
    confidence = Column(Float, nullable=False) # 0.0 to 1.0
    explanation = Column(Text, nullable=False)
    distance_meters = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WorkAssignment(Base):
    __tablename__ = "work_assignments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    priority = Column(String(20), default="medium")
    estimated_hours = Column(Float, default=4.0)
    status = Column(String(50), default="assigned") # assigned, in_progress, completed, reassigned
    notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    incident = relationship("Incident", back_populates="assignments")
    worker = relationship("User", back_populates="assignments", foreign_keys=[worker_id])
    resolution_submissions = relationship("ResolutionSubmission", back_populates="assignment")

class ResolutionSubmission(Base):
    __tablename__ = "resolution_submissions"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("work_assignments.id"), nullable=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    before_photo_path = Column(String(500), nullable=True)
    after_photo_path = Column(String(500), nullable=False)
    resolution_notes = Column(Text, nullable=False)
    validation_status = Column(String(50), default="pending") # pending, valid, flagged, rejected
    validation_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="resolution_submissions")
    assignment = relationship("WorkAssignment", back_populates="resolution_submissions")

class CitizenResolutionFeedback(Base):
    __tablename__ = "citizen_resolution_feedback"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feedback_type = Column(String(50), nullable=False) # confirmed_resolved, problem_still_exists, unable_to_verify
    comments = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="feedback")
    user = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="status_change") # status_change, assignment, reverification, reward, alert
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    scenario_name = Column(String(50), nullable=False) # dry_weather, moderate_rain, heavy_monsoon
    risk_type = Column(String(100), nullable=False) # flood_underpass, sewage_overflow, traffic_gridlock, electrical_hazard
    sector = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False) # low, medium, high, critical
    score = Column(Float, nullable=False) # 0 to 100
    supporting_evidence = Column(JSON, nullable=True)
    assumptions = Column(JSON, nullable=True)
    missing_information = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=False)
    incident_ids = Column(JSON, nullable=True)
    infrastructure_id = Column(Integer, ForeignKey("infrastructure_assets.id"), nullable=True)
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    infrastructure = relationship("InfrastructureAsset")

class InterventionPlan(Base):
    __tablename__ = "intervention_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String(255), nullable=False)
    available_crews = Column(Integer, nullable=False)
    budget_inr = Column(Float, nullable=False)
    time_hours = Column(Float, nullable=False)
    weather_scenario = Column(String(50), default="moderate_rain")
    recommended_actions = Column(JSON, nullable=False)
    alternative_plans = Column(JSON, nullable=True)
    estimated_cost = Column(Float, nullable=False)
    incidents_addressed_count = Column(Integer, nullable=False)
    residual_risks = Column(JSON, nullable=True)
    assumptions = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PointsLedger(Base):
    __tablename__ = "points_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    points = Column(Integer, nullable=False)
    reason_code = Column(String(50), nullable=False) # REPORT_VALID, EVIDENCE_PROVIDED, CONFIRMED_ISSUE, RESOLUTION_VERIFIED, COMMUNITY_REVERIFY, RECURRING_DETECTIVE
    description = Column(String(255), nullable=False)
    reference_id = Column(Integer, nullable=True) # e.g. incident_id or feedback_id
    reference_type = Column(String(50), nullable=True) # incident, resolution, feedback
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ledger_entries")

    __table_args__ = (
        Index("idx_points_unique_ref", "user_id", "reason_code", "reference_id", "reference_type", unique=True),
    )

class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    icon = Column(String(50), nullable=False)
    points_threshold = Column(Integer, default=0)

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge")

    __table_args__ = (
        Index("idx_user_badge_unique", "user_id", "badge_id", unique=True),
    )

class CivicIntelligenceMemory(Base):
    __tablename__ = "civic_intelligence_memory"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    sector = Column(String(50), nullable=False, index=True)
    category = Column(SQLEnum(IncidentCategory), nullable=False)
    recurring_interval_days = Column(Float, nullable=True)
    past_resolution_count = Column(Integer, default=0)
    failure_mode_notes = Column(Text, nullable=True)
    recommended_infrastructure_inspection = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="memory_records")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # PRIORITY_OVERRIDE, STATUS_UPDATE, ASSIGNMENT_CHANGE, REWARD_AUDIT, etc.
    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
