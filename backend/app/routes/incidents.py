import os
import uuid
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Incident, Location, IncidentEvidence, IncidentCategory,
    IncidentStatus, User, UserRole, AuditLog, Notification
)
from app.schemas import (
    IncidentCreate, IncidentOut, IncidentPriorityOverride,
    IncidentStatusUpdate, EvidenceOut, ReportExtractRequest, ReportExtractOut
)
from app.auth import get_current_user, require_role
from app.services.nlp_extractor import nlp_extractor
from app.services.llm_extractor import llm_extractor
from app.services.priority_calculator import priority_calculator
from app.services.graph_service import graph_service
from app.services.memory_service import memory_service
from app.services.rewards_service import rewards_service
from app.config import settings

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.post("/extract", response_model=ReportExtractOut)
def extract_report_fields(
    body: ReportExtractRequest,
    current_user: User = Depends(get_current_user)
):
    """Pulls category / sector / landmark out of free text via the Gemini -> Groq -> OpenRouter chain."""
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    return llm_extractor.extract(text[:4000])

@router.post("/report", response_model=IncidentOut)
def submit_incident_report(
    incident_in: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Run deterministic NLP extraction on raw description
    nlp_res = nlp_extractor.extract(incident_in.description, incident_in.category)
    final_category_str = nlp_res["inferred_category"]
    try:
        final_category = IncidentCategory(final_category_str)
    except ValueError:
        final_category = incident_in.category or IncidentCategory.OTHER

    # 2. Check for recurrence in this sector & category
    existing_count = db.query(Incident).join(Location).filter(
        Location.sector == incident_in.sector,
        Incident.category == final_category,
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED])
    ).count()
    recurrence_count = existing_count + 1

    # 3. Transparent Priority Calculation
    urgency = nlp_res["urgency"]
    impact = "high" if recurrence_count >= 3 or urgency in ["critical", "high"] else "medium"
    priority_res = priority_calculator.calculate(
        urgency=urgency,
        impact=impact,
        recurrence_count=recurrence_count,
        unresolved_hours=0.0,
        evidence_confidence=nlp_res["confidence_score"]
    )

    # 4. Create Location
    loc = Location(
        sector=incident_in.sector,
        landmark=incident_in.landmark,
        latitude=incident_in.latitude,
        longitude=incident_in.longitude,
        address=incident_in.address,
        is_gps_verified=incident_in.is_gps_verified
    )
    db.add(loc)
    db.flush()

    # 5. Generate Incident Number
    inc_num = f"CP-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    title = incident_in.title or f"{final_category.value.replace('_', ' ').title()} near {incident_in.landmark or incident_in.sector}"

    incident = Incident(
        incident_number=inc_num,
        user_id=current_user.id,
        title=title,
        description=incident_in.description,
        raw_text=incident_in.description,
        category=final_category,
        language=nlp_res["detected_language"],
        urgency=urgency,
        impact=impact,
        recurrence_count=recurrence_count,
        priority_score=priority_res["score"],
        status=IncidentStatus.REPORTED,
        location_id=loc.id,
        evidence_confidence=nlp_res["confidence_score"],
        ai_extraction_meta={
            "nlp": nlp_res,
            "priority_factors": priority_res["breakdown"],
            "priority_explanation": priority_res["explanation"]
        },
        is_synthetic=False
    )
    db.add(incident)
    db.flush()

    # 6. Graph clustering & duplicate check
    dup_suggestions = graph_service.detect_potential_duplicate_or_cluster(
        db, incident, incident_in.latitude, incident_in.longitude
    )
    if dup_suggestions:
        incident.ai_extraction_meta["duplicate_suggestions"] = dup_suggestions

    # 7. Civic Intelligence Memory
    memory_service.record_or_update_memory(db, incident)

    # 8. Award Points to Citizen (+10 for valid report)
    if current_user.role == UserRole.CITIZEN:
        rewards_service.award_points(
            db,
            user_id=current_user.id,
            reason_code="REPORT_VALID",
            reference_id=incident.id,
            reference_type="incident"
        )

    # 9. In-app confirmation notification
    db.add(Notification(
        user_id=current_user.id,
        title=f"Incident Registered: #{inc_num}",
        message=f"Your civic report has been lodged with Priority Score {priority_res['score']}/100. Municipal monitoring initiated.",
        notification_type="status_change",
        incident_id=incident.id
    ))

    db.commit()
    db.refresh(incident)
    return incident

@router.post("/{incident_id}/evidence", response_model=EvidenceOut)
async def upload_incident_evidence(
    incident_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".mp3", ".wav", ".webm", ".m4a"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {allowed_exts}")

    filename = f"ev_{incident_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    rel_path = f"/uploads/{filename}"

    evidence = IncidentEvidence(
        incident_id=incident.id,
        file_path=rel_path,
        file_type=file.content_type or f"file/{ext.replace('.', '')}",
        file_size=file_size,
        caption=caption,
        uploaded_by=current_user.id
    )
    db.add(evidence)

    # Upgrade evidence confidence and recalculate priority
    incident.evidence_confidence = min(0.95, round(incident.evidence_confidence + 0.15, 2))
    recalc = priority_calculator.calculate(
        urgency=incident.urgency,
        impact=incident.impact,
        recurrence_count=incident.recurrence_count,
        unresolved_hours=0.0,
        evidence_confidence=incident.evidence_confidence
    )
    incident.priority_score = recalc["score"]

    # Award points for evidence contribution (+5 pts)
    if current_user.role == UserRole.CITIZEN:
        rewards_service.award_points(
            db,
            user_id=current_user.id,
            reason_code="EVIDENCE_PROVIDED",
            reference_id=incident.id,
            reference_type="incident"
        )

    db.commit()
    db.refresh(evidence)
    return evidence

@router.get("", response_model=List[IncidentOut])
def get_incidents(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    query = db.query(Incident).join(Location)

    if search:
        query = query.filter(
            (Incident.title.ilike(f"%{search}%")) |
            (Incident.description.ilike(f"%{search}%")) |
            (Incident.incident_number.ilike(f"%{search}%")) |
            (Location.landmark.ilike(f"%{search}%"))
        )
    if category and category.lower() != "all":
        query = query.filter(Incident.category == category)
    if sector and sector.lower() != "all":
        query = query.filter(Location.sector == sector)
    if status and status.lower() != "all":
        query = query.filter(Incident.status == status)
    if urgency and urgency.lower() != "all":
        query = query.filter(Incident.urgency == urgency)

    incidents = query.order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()
    return incidents

@router.get("/my", response_model=List[IncidentOut])
def get_my_incidents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incidents = db.query(Incident).filter(Incident.user_id == current_user.id).order_by(Incident.created_at.desc()).all()
    return incidents

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident_detail(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{incident_id}/priority-override", response_model=IncidentOut)
def override_incident_priority(
    incident_id: int,
    override_in: IncidentPriorityOverride,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_score = incident.priority_override if incident.priority_override is not None else incident.priority_score
    incident.priority_override = override_in.priority_override
    incident.override_reason = override_in.override_reason
    incident.override_by = current_user.id
    incident.updated_at = datetime.utcnow()

    # Create immutable audit log entry
    audit = AuditLog(
        user_id=current_user.id,
        action="PRIORITY_OVERRIDE",
        target_type="incident",
        target_id=incident.id,
        details={
            "old_score": old_score,
            "new_score": override_in.priority_override,
            "reason": override_in.override_reason
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)
    return incident

@router.patch("/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(
    incident_id: int,
    status_in: IncidentStatusUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.FIELD_WORKER])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = incident.status.value
    incident.status = status_in.status
    incident.updated_at = datetime.utcnow()

    # Notify reporter about status update
    db.add(Notification(
        user_id=incident.user_id,
        title=f"Status Updated: #{incident.incident_number}",
        message=f"Status changed from {old_status} to {status_in.status.value.upper()}. Notes: {status_in.notes or 'None'}.",
        notification_type="status_change",
        incident_id=incident.id
    ))

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="STATUS_UPDATE",
        target_type="incident",
        target_id=incident.id,
        details={"from": old_status, "to": status_in.status.value, "notes": status_in.notes}
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)
    return incident
