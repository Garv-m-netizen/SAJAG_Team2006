from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import (
    User, CitizenProfile, PointsLedger, Badge,
    UserBadge, Incident, CitizenResolutionFeedback
)

POINT_RULES = {
    "REPORT_VALID": {"points": 10, "desc": "Submission of a valid, verified civic report"},
    "EVIDENCE_PROVIDED": {"points": 5, "desc": "High quality photographic/audio evidence attached"},
    "CONFIRMED_ISSUE": {"points": 10, "desc": "Municipal verification confirmed as genuine public issue"},
    "RESOLUTION_VERIFIED": {"points": 15, "desc": "Citizen report contributed directly to completed public resolution"},
    "COMMUNITY_REVERIFY": {"points": 3, "desc": "Constructive civic participation in verifying field repair work"},
    "RECURRING_DETECTIVE": {"points": 20, "desc": "Identification of a chronic recurring infrastructural failure mode"},
}

LEVEL_THRESHOLDS = [
    {"level": "Neighborhood Guardian", "min_points": 250},
    {"level": "Civic Champion", "min_points": 100},
    {"level": "Community Helper", "min_points": 40},
    {"level": "Civic Observer", "min_points": 0},
]

class RewardsService:
    """
    Manages citizen rewards, immutable points ledger, level recalculations,
    badge evaluations, and tamper-resistant civic leaderboards.
    """

    def award_points(
        self,
        db: Session,
        user_id: int,
        reason_code: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        custom_points: Optional[int] = None
    ) -> Optional[PointsLedger]:
        """
        Awards points to user with database idempotency protection.
        Prevents duplicate points for identical reason and reference.
        """
        rule = POINT_RULES.get(reason_code)
        pts = custom_points if custom_points is not None else (rule["points"] if rule else 5)
        desc = rule["desc"] if rule else f"Civic contribution: {reason_code}"

        # Check for existing identical transaction in ledger
        existing = db.query(PointsLedger).filter(
            PointsLedger.user_id == user_id,
            PointsLedger.reason_code == reason_code,
            PointsLedger.reference_id == reference_id,
            PointsLedger.reference_type == reference_type
        ).first()

        if existing:
            # Already awarded, do not duplicate
            return existing

        entry = PointsLedger(
            user_id=user_id,
            points=pts,
            reason_code=reason_code,
            description=desc,
            reference_id=reference_id,
            reference_type=reference_type,
            created_at=datetime.utcnow()
        )
        db.add(entry)

        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            return None

        # Update profile points and level
        profile = db.query(CitizenProfile).filter(CitizenProfile.user_id == user_id).first()
        if profile:
            profile.total_points += pts
            # Determine new level
            for lvl in LEVEL_THRESHOLDS:
                if profile.total_points >= lvl["min_points"]:
                    profile.current_level = lvl["level"]
                    break

        # Check badge awards
        self.evaluate_badges(db, user_id)
        db.commit()
        return entry

    def evaluate_badges(self, db: Session, user_id: int):
        profile = db.query(CitizenProfile).filter(CitizenProfile.user_id == user_id).first()
        if not profile:
            return

        badges = db.query(Badge).all()
        for b in badges:
            # Check if user already has badge
            has_badge = db.query(UserBadge).filter(
                UserBadge.user_id == user_id,
                UserBadge.badge_id == b.id
            ).first()

            if not has_badge:
                awarded = False
                if b.code == "VERIFIED_REPORTER":
                    count = db.query(Incident).filter(Incident.user_id == user_id).count()
                    if count >= 1:
                        awarded = True
                elif b.code == "EVIDENCE_CONTRIBUTOR":
                    ev_count = db.query(PointsLedger).filter(
                        PointsLedger.user_id == user_id,
                        PointsLedger.reason_code == "EVIDENCE_PROVIDED"
                    ).count()
                    if ev_count >= 1:
                        awarded = True
                elif b.code == "RESOLUTION_SUPPORTER":
                    res_count = db.query(PointsLedger).filter(
                        PointsLedger.user_id == user_id,
                        PointsLedger.reason_code == "COMMUNITY_REVERIFY"
                    ).count()
                    if res_count >= 2:
                        awarded = True
                elif b.code == "RECURRING_DETECTIVE":
                    rec_count = db.query(PointsLedger).filter(
                        PointsLedger.user_id == user_id,
                        PointsLedger.reason_code == "RECURRING_DETECTIVE"
                    ).count()
                    if rec_count >= 1:
                        awarded = True
                elif profile.total_points >= b.points_threshold and b.points_threshold > 0:
                    awarded = True

                if awarded:
                    db.add(UserBadge(user_id=user_id, badge_id=b.id, awarded_at=datetime.utcnow()))

    def get_leaderboard(self, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Builds annual leaderboard using privacy-conscious display names.
        """
        profiles = db.query(CitizenProfile).join(User).order_by(
            CitizenProfile.total_points.desc()
        ).limit(limit).all()

        results = []
        for idx, p in enumerate(profiles, start=1):
            user = p.user
            verified_count = db.query(Incident).filter(Incident.user_id == user.id).count()
            conf_count = db.query(CitizenResolutionFeedback).filter(
                CitizenResolutionFeedback.user_id == user.id,
                CitizenResolutionFeedback.feedback_type == "confirmed_resolved"
            ).count()
            badge_count = db.query(UserBadge).filter(UserBadge.user_id == user.id).count()

            # Privacy rule: if anonymous_pref is true or citizen requested privacy, redact surname
            name = p.display_name
            if p.anonymous_pref:
                parts = name.split()
                name = parts[0] + " " + (parts[1][0] + "." if len(parts) > 1 else "C.")

            results.append({
                "rank": idx,
                "user_id": user.id,
                "display_name": name,
                "sector": user.sector or "Chandigarh UT",
                "total_points": p.total_points,
                "level": p.current_level,
                "verified_reports_count": verified_count,
                "confirmed_resolutions_count": conf_count,
                "badges_count": badge_count
            })

        return results

rewards_service = RewardsService()
