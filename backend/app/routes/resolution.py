from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Incident, WorkAssignment, ResolutionSubmission,
    CitizenResolutionFeedback, User, UserRole, Notification
)
from app.schemas import (
    WorkAssignmentOut, ResolutionSubmissionCreate,
    ResolutionSubmissionOut, CitizenFeedbackCreate, CitizenFeedbackOut
)
from app.auth import get_current_user, require_role
from app.services.verification_service import verification_service
from app.services.rewards_service import rewards_service

router = APIRouter(prefix="/resolution", tags=["Resolution & Verification"])

@router.get("/assignments", response_model=List[WorkAssignmentOut])
def get_assignments(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(WorkAssignment)
    if current_user.role == UserRole.FIELD_WORKER:
        query = query.filter(WorkAssignment.worker_id == current_user.id)

    if status and status.lower() != "all":
        query = query.filter(WorkAssignment.status == status)

    assignments = query.order_by(WorkAssignment.assigned_at.desc()).all()
    return assignments

@router.post("/submit", response_model=ResolutionSubmissionOut)
def submit_resolution_proof(
    submission_in: ResolutionSubmissionCreate,
    current_user: User = Depends(require_role([UserRole.FIELD_WORKER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == submission_in.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Run verification checks
    check_res = verification_service.validate_resolution_evidence(
        db=db,
        incident_id=submission_in.incident_id,
        worker_id=current_user.id,
        after_photo_path=submission_in.after_photo_path,
        resolution_notes=submission_in.resolution_notes,
        before_photo_path=submission_in.before_photo_path
    )

    submission = ResolutionSubmission(
        incident_id=incident.id,
        assignment_id=submission_in.assignment_id,
        worker_id=current_user.id,
        before_photo_path=submission_in.before_photo_path,
        after_photo_path=submission_in.after_photo_path,
        resolution_notes=submission_in.resolution_notes,
        validation_status=check_res["validation_status"],
        validation_notes=check_res["validation_notes"],
        submitted_at=datetime.utcnow()
    )
    db.add(submission)
    db.flush()

    # Update assignment status if linked
    if submission_in.assignment_id:
        assignment = db.query(WorkAssignment).filter(WorkAssignment.id == submission_in.assignment_id).first()
        if assignment:
            assignment.status = "completed"
            assignment.completed_at = datetime.utcnow()

    # Process notification & incident status update
    verification_service.process_worker_submission(db, incident, submission)
    db.commit()
    db.refresh(submission)
    return submission

@router.post("/feedback", response_model=Dict[str, Any])
def submit_citizen_reverification(
    feedback_in: CitizenFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == feedback_in.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = verification_service.submit_citizen_feedback(
        db=db,
        incident=incident,
        user=current_user,
        feedback_type=feedback_in.feedback_type,
        comments=feedback_in.comments
    )

    # Award points for community participation (+3 pts)
    rewards_service.award_points(
        db,
        user_id=current_user.id,
        reason_code="COMMUNITY_REVERIFY",
        reference_id=incident.id,
        reference_type="incident"
    )

    # If confirmed resolved and current user or original reporter contributed, award resolution bonus (+15 pts)
    if feedback_in.feedback_type == "confirmed_resolved":
        rewards_service.award_points(
            db,
            user_id=incident.user_id,
            reason_code="RESOLUTION_VERIFIED",
            reference_id=incident.id,
            reference_type="incident"
        )

    return result

@router.get("/submissions/{incident_id}", response_model=List[ResolutionSubmissionOut])
def get_incident_submissions(incident_id: int, db: Session = Depends(get_db)):
    submissions = db.query(ResolutionSubmission).filter(
        ResolutionSubmission.incident_id == incident_id
    ).order_by(ResolutionSubmission.submitted_at.desc()).all()
    return submissions
