from app.services.verification_service import verification_service
from app.services.rewards_service import rewards_service
from app.models import User, Incident, CitizenProfile, PointsLedger, IncidentStatus

def test_rewards_points_and_idempotency(db):
    user = db.query(User).filter(User.email == "citizen1@chandigarh.org").first()
    assert user is not None

    profile_before = db.query(CitizenProfile).filter(CitizenProfile.user_id == user.id).first()
    initial_pts = profile_before.total_points

    # Award points for a specific incident report
    entry1 = rewards_service.award_points(
        db,
        user_id=user.id,
        reason_code="REPORT_VALID",
        reference_id=9999,
        reference_type="incident"
    )
    assert entry1 is not None

    db.refresh(profile_before)
    assert profile_before.total_points == initial_pts + 10

    # Repeat award with identical reason and reference (must be idempotent - no duplicate points)
    entry2 = rewards_service.award_points(
        db,
        user_id=user.id,
        reason_code="REPORT_VALID",
        reference_id=9999,
        reference_type="incident"
    )
    db.refresh(profile_before)
    assert profile_before.total_points == initial_pts + 10 # unchanged

def test_resolution_evidence_validation(db):
    incident = db.query(Incident).first()
    user = db.query(User).filter(User.role == "field_worker").first()

    # Valid submission
    res_valid = verification_service.validate_resolution_evidence(
        db,
        incident_id=incident.id,
        worker_id=user.id,
        after_photo_path="https://example.com/clean.jpg",
        resolution_notes="Desilted culvert completely with high volume tanker."
    )
    assert res_valid["validation_status"] == "valid"

    # Missing after photo
    res_invalid = verification_service.validate_resolution_evidence(
        db,
        incident_id=incident.id,
        worker_id=user.id,
        after_photo_path="",
        resolution_notes="Short"
    )
    assert res_invalid["validation_status"] == "rejected"
