from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Incident, Location, WorkAssignment, IncidentCluster,
    IncidentStatus, User, UserRole, AuditLog, Notification
)
from app.schemas import WorkAssignmentCreate, WorkAssignmentOut, NotificationOut
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/dashboard-stats")
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """
    Computes live operational indicators directly from stored database records.
    """
    open_incidents_count = db.query(Incident).filter(
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED])
    ).count()

    high_priority_count = db.query(Incident).filter(
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED]),
        (Incident.priority_override >= 75.0) | ((Incident.priority_override == None) & (Incident.priority_score >= 75.0))
    ).count()

    clusters_count = db.query(IncidentCluster).filter(IncidentCluster.status == "active").count()

    pending_assignments_count = db.query(WorkAssignment).filter(
        WorkAssignment.status.in_(["assigned", "in_progress"])
    ).count()

    awaiting_verification_count = db.query(Incident).filter(
        Incident.status == IncidentStatus.AWAITING_VERIFICATION
    ).count()

    recently_resolved_count = db.query(Incident).filter(
        Incident.status == IncidentStatus.RESOLVED
    ).count()

    critical_hazards_count = db.query(Incident).filter(
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED]),
        Incident.urgency == "critical"
    ).count()

    return {
        "open_incidents": open_incidents_count,
        "high_priority_incidents": high_priority_count,
        "recurring_clusters": clusters_count,
        "pending_assignments": pending_assignments_count,
        "awaiting_verification": awaiting_verification_count,
        "recently_resolved": recently_resolved_count,
        "critical_hazards": critical_hazards_count
    }

@router.post("/assign", response_model=WorkAssignmentOut)
def assign_work_to_field_worker(
    assignment_in: WorkAssignmentCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == assignment_in.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    worker = db.query(User).filter(User.id == assignment_in.worker_id, User.role == UserRole.FIELD_WORKER).first()
    if not worker:
        raise HTTPException(status_code=400, detail="Invalid field worker selected")

    assignment = WorkAssignment(
        incident_id=incident.id,
        worker_id=worker.id,
        assigned_by=current_user.id,
        priority=assignment_in.priority,
        estimated_hours=assignment_in.estimated_hours,
        status="assigned",
        notes=assignment_in.notes,
        assigned_at=datetime.utcnow()
    )
    db.add(assignment)

    # Update incident state to ASSIGNED
    incident.status = IncidentStatus.ASSIGNED
    incident.updated_at = datetime.utcnow()

    # Notify field worker
    db.add(Notification(
        user_id=worker.id,
        title=f"New Work Assignment: #{incident.incident_number}",
        message=f"You have been assigned to #{incident.incident_number} ({incident.title}) in {incident.location.sector}. Priority: {assignment_in.priority.upper()}.",
        notification_type="assignment",
        incident_id=incident.id
    ))

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="WORK_ASSIGNED",
        target_type="incident",
        target_id=incident.id,
        details={"worker_id": worker.id, "worker_name": worker.full_name, "notes": assignment_in.notes}
    )
    db.add(audit)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("/audit-logs")
def get_audit_trail(
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    results = []
    for l in logs:
        user = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        results.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_name": user.full_name if user else "System",
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "created_at": l.created_at.isoformat()
        })
    return results

@router.get("/notifications", response_model=List[NotificationOut])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()
    return notifs

@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

@router.post("/reset-seed")
def reset_and_seed_database(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    from app.seed_data import seed_database
    seed_database(db, wipe_existing=True)
    return {"status": "success", "message": "Database wiped and re-seeded with realistic Chandigarh demonstration records."}
