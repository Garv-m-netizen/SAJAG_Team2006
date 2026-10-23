import os
import shutil
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings

from app.database import get_db
from app.models import (
    Incident, WorkAssignment, ResolutionSubmission,
    CitizenResolutionFeedback, User, UserRole, Notification
)
from app.schemas import (
    WorkAssignmentOut, WorkAssignmentStatusUpdate, ResolutionSubmissionCreate,
    ResolutionSubmissionOut, CitizenFeedbackCreate, CitizenFeedbackOut,
    CitizenFeedbackDetail
)
from app.auth import get_current_user, require_role
from app.services.verification_service import verification_service
from app.services.rewards_service import rewards_service

router = APIRouter(prefix="/resolution", tags=["Resolution & Verification"])

@router.post("/upload-photo")
async def upload_resolution_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.FIELD_WORKER, UserRole.ADMIN]))
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: .jpg, .jpeg, .png, .webp")

    filename = f"res_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    with open(os.path.join(settings.UPLOAD_DIR, filename), "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"path": f"/uploads/{filename}"}

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

@router.patch("/assignments/{assignment_id}/status", response_model=WorkAssignmentOut)
def update_assignment_status(
    assignment_id: int,
    status_update: WorkAssignmentStatusUpdate,
    current_user: User = Depends(require_role([UserRole.FIELD_WORKER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    assignment = db.query(WorkAssignment).filter(WorkAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Work assignment not found")
    if current_user.role == UserRole.FIELD_WORKER and assignment.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this assignment")
    assignment.status = status_update.status
    if status_update.notes:
        assignment.notes = status_update.notes
    if status_update.status == "in_progress":
        incident = db.query(Incident).filter(Incident.id == assignment.incident_id).first()
        if incident and incident.status in ["assigned", "reported"]:
            incident.status = "in_progress"
            incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/submit", response_model=ResolutionSubmissionOut)
def submit_resolution_proof(
    submission_in: ResolutionSubmissionCreate,
    current_user: User = Depends(require_role([UserRole.FIELD_WORKER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == submission_in.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if submission_in.assignment_id:
        linked = db.query(WorkAssignment).filter(WorkAssignment.id == submission_in.assignment_id).first()
        if linked and linked.status == "completed":
            raise HTTPException(status_code=400, detail="Resolution proof was already submitted for this work order")

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

    already = db.query(CitizenResolutionFeedback).filter(
        CitizenResolutionFeedback.incident_id == incident.id,
        CitizenResolutionFeedback.user_id == current_user.id
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="You have already submitted reverification for this incident")

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

@router.get("/feedback/{incident_id}", response_model=List[CitizenFeedbackDetail])
def get_incident_feedback(
    incident_id: int,
    current_user: User = Depends(require_role([UserRole.FIELD_WORKER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Citizen reverification feedback, visible to field workers and municipal officers."""
    rows = db.query(CitizenResolutionFeedback).filter(
        CitizenResolutionFeedback.incident_id == incident_id
    ).order_by(CitizenResolutionFeedback.submitted_at.desc()).all()
    return [
        CitizenFeedbackDetail(
            id=r.id, incident_id=r.incident_id, user_id=r.user_id,
            feedback_type=r.feedback_type, comments=r.comments,
            submitted_at=r.submitted_at, user_name=r.user.full_name if r.user else None
        )
        for r in rows
    ]

@router.get("/my-feedback", response_model=List[int])
def get_my_reverified_incident_ids(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Incident ids this user has already reverified (so the UI can drop the submit form)."""
    rows = db.query(CitizenResolutionFeedback.incident_id).filter(
        CitizenResolutionFeedback.user_id == current_user.id
    ).all()
    return [r[0] for r in rows]
