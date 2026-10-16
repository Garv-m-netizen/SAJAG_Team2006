from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, CitizenProfile, PointsLedger, Badge, UserBadge
from app.schemas import PointsLedgerOut, BadgeOut, LeaderboardEntryOut
from app.auth import get_current_user
from app.services.rewards_service import rewards_service, LEVEL_THRESHOLDS, POINT_RULES

router = APIRouter(prefix="/rewards", tags=["Civic Champion Rewards"])

@router.get("/dashboard")
def get_user_rewards_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CitizenProfile).filter(CitizenProfile.user_id == current_user.id).first()
    if not profile:
        profile = CitizenProfile(
            user_id=current_user.id,
            display_name=current_user.full_name,
            anonymous_pref=False,
            total_points=0,
            current_level="Civic Observer"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Next level progress
    next_level = None
    points_to_next = 0
    current_idx = 0
    for idx, lvl in enumerate(reversed(LEVEL_THRESHOLDS)):
        if profile.total_points < lvl["min_points"]:
            next_level = lvl["level"]
            points_to_next = lvl["min_points"] - profile.total_points
            break

    # Ledger entries
    ledger = db.query(PointsLedger).filter(
        PointsLedger.user_id == current_user.id
    ).order_by(PointsLedger.created_at.desc()).limit(30).all()

    # User badges
    user_badges = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    earned_badge_ids = {ub.badge_id: ub.awarded_at for ub in user_badges}

    all_badges = db.query(Badge).all()
    badges_out = []
    for b in all_badges:
        is_earned = b.id in earned_badge_ids
        badges_out.append({
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "points_threshold": b.points_threshold,
            "is_earned": is_earned,
            "awarded_at": earned_badge_ids.get(b.id)
        })

    return {
        "user_id": current_user.id,
        "display_name": profile.display_name,
        "anonymous_pref": profile.anonymous_pref,
        "total_points": profile.total_points,
        "current_level": profile.current_level,
        "next_level": next_level or "Maximum Level Reached",
        "points_to_next": points_to_next,
        "earned_badges_count": len(earned_badge_ids),
        "badges": badges_out,
        "ledger": ledger,
        "rules": POINT_RULES
    }

@router.get("/leaderboard", response_model=List[LeaderboardEntryOut])
def get_leaderboard(
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db)
):
    return rewards_service.get_leaderboard(db, limit=limit)

@router.get("/badges", response_model=List[BadgeOut])
def get_all_badges(db: Session = Depends(get_db)):
    badges = db.query(Badge).all()
    return badges

@router.post("/toggle-privacy")
def toggle_privacy_preference(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CitizenProfile).filter(CitizenProfile.user_id == current_user.id).first()
    if profile:
        profile.anonymous_pref = not profile.anonymous_pref
        db.commit()
        return {"anonymous_pref": profile.anonymous_pref}
    return {"anonymous_pref": False}
