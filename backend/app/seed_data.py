from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    User, CitizenProfile, Location, InfrastructureAsset,
    Incident, IncidentEvidence, IncidentCluster, IncidentRelationship,
    WorkAssignment, ResolutionSubmission, CitizenResolutionFeedback,
    Notification, Badge, UserBadge, PointsLedger, AuditLog,
    CivicIntelligenceMemory, UserRole, IncidentCategory, IncidentStatus
)
from app.auth import get_password_hash
from app.services.priority_calculator import priority_calculator
from app.services.rewards_service import POINT_RULES

def seed_database(db: Session, wipe_existing: bool = False):
    """
    Populates database with realistic, high-fidelity synthetic civic data for Chandigarh.
    All demonstration records are explicitly labeled with is_synthetic=True.
    """
    if wipe_existing:
        db.query(AuditLog).delete()
        db.query(CivicIntelligenceMemory).delete()
        db.query(CitizenResolutionFeedback).delete()
        db.query(ResolutionSubmission).delete()
        db.query(WorkAssignment).delete()
        db.query(IncidentRelationship).delete()
        db.query(IncidentEvidence).delete()
        db.query(Incident).delete()
        db.query(IncidentCluster).delete()
        db.query(InfrastructureAsset).delete()
        db.query(Location).delete()
        db.query(PointsLedger).delete()
        db.query(UserBadge).delete()
        db.query(Badge).delete()
        db.query(CitizenProfile).delete()
        db.query(Notification).delete()
        db.query(User).delete()
        db.commit()

    # If users already exist and not wiping, skip
    if db.query(User).count() > 0:
        return

    # 1. Seed Badges
    badges_data = [
        {"code": "VERIFIED_REPORTER", "name": "Verified Reporter", "description": "Submitted an authentic, GPS-verified civic issue.", "icon": "ShieldCheck", "points_threshold": 10},
        {"code": "EVIDENCE_CONTRIBUTOR", "name": "Evidence Contributor", "description": "Provided clear photographic or audio documentation.", "icon": "Camera", "points_threshold": 25},
        {"code": "RESOLUTION_SUPPORTER", "name": "Resolution Supporter", "description": "Participated in community field verification.", "icon": "CheckCircle2", "points_threshold": 50},
        {"code": "RECURRING_DETECTIVE", "name": "Recurring Issue Detective", "description": "Identified chronic civic failure modes and hotspots.", "icon": "Search", "points_threshold": 100},
        {"code": "COMMUNITY_GUARDIAN", "name": "Community Guardian", "description": "Top tier civic contributor protecting neighborhood safety.", "icon": "Award", "points_threshold": 250},
    ]
    for bd in badges_data:
        db.add(Badge(**bd))
    db.flush()

    # 2. Seed Users
    hashed_pwd_admin = get_password_hash("Admin@123")
    hashed_pwd_worker = get_password_hash("Worker@123")
    hashed_pwd_citizen = get_password_hash("Citizen@123")

    admin_user = User(
        email="admin@civicpulse.chandigarh.gov.in",
        hashed_password=hashed_pwd_admin,
        full_name="Dr. Rajesh Sharma",
        role=UserRole.ADMIN,
        sector="Sector 17",
        phone="+91-172-2740001"
    )
    db.add(admin_user)

    worker1 = User(
        email="worker1@civicpulse.chandigarh.gov.in",
        hashed_password=hashed_pwd_worker,
        full_name="Vikram Singh",
        role=UserRole.FIELD_WORKER,
        sector="Sector 22",
        phone="+91-98765-43210"
    )
    worker2 = User(
        email="worker2@civicpulse.chandigarh.gov.in",
        hashed_password=hashed_pwd_worker,
        full_name="Sunil Kumar",
        role=UserRole.FIELD_WORKER,
        sector="Sector 26",
        phone="+91-98765-43211"
    )
    db.add(worker1)
    db.add(worker2)

    citizens = [
        User(email="citizen1@chandigarh.org", hashed_password=hashed_pwd_citizen, full_name="Garv Sharma", role=UserRole.CITIZEN, sector="Sector 22", phone="+91-98111-22334"),
        User(email="citizen2@chandigarh.org", hashed_password=hashed_pwd_citizen, full_name="Simran Kaur", role=UserRole.CITIZEN, sector="Sector 17", phone="+91-98222-33445"),
        User(email="citizen3@chandigarh.org", hashed_password=hashed_pwd_citizen, full_name="Aman Verma", role=UserRole.CITIZEN, sector="Sector 35", phone="+91-98333-44556"),
        User(email="citizen4@chandigarh.org", hashed_password=hashed_pwd_citizen, full_name="Neha Joshi", role=UserRole.CITIZEN, sector="Manimajra", phone="+91-98444-55667"),
    ]
    for c in citizens:
        db.add(c)
    db.flush()

    # Profiles & Welcome Points
    profiles = [
        CitizenProfile(user_id=citizens[0].id, display_name="Garv S.", anonymous_pref=False, total_points=145, current_level="Civic Champion"),
        CitizenProfile(user_id=citizens[1].id, display_name="Simran K.", anonymous_pref=False, total_points=85, current_level="Community Helper"),
        CitizenProfile(user_id=citizens[2].id, display_name="Aman V.", anonymous_pref=True, total_points=35, current_level="Civic Observer"),
        CitizenProfile(user_id=citizens[3].id, display_name="Neha J.", anonymous_pref=False, total_points=260, current_level="Neighborhood Guardian"),
    ]
    for p in profiles:
        db.add(p)
    db.flush()

    # 3. Seed Infrastructure Assets in Chandigarh
    infra_assets = [
        InfrastructureAsset(asset_type="underpass", name="Sector 17/22 Pedestrian & Transit Underpass", sector="Sector 17", latitude=30.7398, longitude=76.7784, vulnerability_rating=0.82, criticality="critical", notes="Prone to stormwater pooling when culvert feeder line clogs."),
        InfrastructureAsset(asset_type="stormwater_culvert", name="Sector 26 Grain Market Drainage Outfall", sector="Sector 26", latitude=30.7258, longitude=76.8042, vulnerability_rating=0.74, criticality="high", notes="High vegetable waste ingress during morning wholesale operations."),
        InfrastructureAsset(asset_type="underpass", name="Tribune Chowk Underpass", sector="Industrial Area Phase 1", latitude=30.7071, longitude=76.7925, vulnerability_rating=0.68, criticality="critical", notes="Heavy vehicular transit corridor connecting Mohali and Panchkula."),
        InfrastructureAsset(asset_type="traffic_signal", name="Aroma Chowk Illumination & Traffic Hub", sector="Sector 22", latitude=30.7324, longitude=76.7725, vulnerability_rating=0.45, criticality="medium", notes="Key arterial intersection with high evening pedestrian footfall."),
        InfrastructureAsset(asset_type="roundabout", name="Sector 35/36 Kisan Bhawan Roundabout", sector="Sector 35", latitude=30.7226, longitude=76.7642, vulnerability_rating=0.50, criticality="medium", notes="Frequent surface asphalt degradation along turning radii."),
        InfrastructureAsset(asset_type="water_main", name="Sector 43 ISBT Potable Supply Feeder", sector="Sector 43", latitude=30.7180, longitude=76.7520, vulnerability_rating=0.60, criticality="high", notes="High pressure municipal line serving interstate bus terminus."),
        InfrastructureAsset(asset_type="stormwater_culvert", name="Manimajra Modern Housing Complex Drain", sector="Manimajra", latitude=30.7230, longitude=76.8390, vulnerability_rating=0.79, criticality="high", notes="Vulnerable culvert network serving high-density residential zone."),
    ]
    for ia in infra_assets:
        db.add(ia)
    db.flush()

    # 4. Seed Canonical Clusters
    cluster1 = IncidentCluster(cluster_name="Sector 22 Aroma Market Recurring Waste Ingress", sector="Sector 22", category=IncidentCategory.GARBAGE, status="active", recurring_count=3, first_reported_at=datetime.utcnow() - timedelta(days=12), last_reported_at=datetime.utcnow() - timedelta(hours=4))
    cluster2 = IncidentCluster(cluster_name="Sector 26 Wholesale Market Drainage Overflow", sector="Sector 26", category=IncidentCategory.DRAINAGE, status="active", recurring_count=4, first_reported_at=datetime.utcnow() - timedelta(days=20), last_reported_at=datetime.utcnow() - timedelta(days=1))
    db.add(cluster1)
    db.add(cluster2)
    db.flush()

    # 5. Seed Incidents with Locations and Evidence
    incident_data = [
        {
            "num": "CP-2610-0101",
            "user_id": citizens[0].id,
            "title": "Severe stormwater drain blockage causing road inundation",
            "desc": "The main roadside stormwater drain near Aroma Hotel is completely choked with plastic containers and mud. Dark foul water is overflowing onto the road making it impossible for pedestrians.",
            "raw": "Aroma light ke paas naali puri tarah se jam hai, ganda paani sadak par aa gaya hai.",
            "cat": IncidentCategory.DRAINAGE,
            "lang": "hi",
            "urgency": "critical",
            "impact": "high",
            "rec": 3,
            "status": IncidentStatus.ASSIGNED,
            "sec": "Sector 22",
            "lm": "Near Aroma Hotel Chowk",
            "lat": 30.7328,
            "lon": 76.7729,
            "conf": 0.92,
            "cluster_id": cluster1.id,
            "days_ago": 2.5
        },
        {
            "num": "CP-2610-0102",
            "user_id": citizens[1].id,
            "title": "Overflowing commercial garbage dump outside market booths",
            "desc": "Garbage dump near booth market has not been lifted for 4 days. Street animals are scattering waste across the pedestrian path. Heavy foul smell entering nearby shops.",
            "raw": "Booth market Sector 22 vich kooda 4 dina ton nahi chukeya gaya, bohot badbu aa rahi hai.",
            "cat": IncidentCategory.GARBAGE,
            "lang": "pa",
            "urgency": "high",
            "impact": "medium",
            "rec": 2,
            "status": IncidentStatus.UNDER_REVIEW,
            "sec": "Sector 22",
            "lm": "Booth Market Line B",
            "lat": 30.7335,
            "lon": 76.7718,
            "conf": 0.88,
            "cluster_id": cluster1.id,
            "days_ago": 1.2
        },
        {
            "num": "CP-2610-0103",
            "user_id": citizens[2].id,
            "title": "Deep hazardous pothole on Sector 35 roundabout inner lane",
            "desc": "A very deep crater has opened up on the road surface near Kisan Bhawan roundabout. Two two-wheelers skidded last night in the dark. Needs immediate asphalt cold patching.",
            "raw": "Deep dangerous pothole right at Kisan Bhawan roundabout. Immediate accident hazard.",
            "cat": IncidentCategory.POTHOLES,
            "lang": "en",
            "urgency": "critical",
            "impact": "high",
            "rec": 1,
            "status": IncidentStatus.REPORTED,
            "sec": "Sector 35",
            "lm": "Opposite Kisan Bhawan Roundabout",
            "lat": 30.7224,
            "lon": 76.7645,
            "conf": 0.90,
            "cluster_id": None,
            "days_ago": 0.8
        },
        {
            "num": "CP-2610-0104",
            "user_id": citizens[3].id,
            "title": "Choked culvert causing market waterlogging in Grain Market",
            "desc": "Drainage outfall culvert blocked by rotting vegetable crates. Stagnant water is 8 inches deep inside the loading bays. High risk of contamination and dengue breeding.",
            "raw": "Sabzi mandi main culvert poora band hai, paani dukaano me ghus raha hai.",
            "cat": IncidentCategory.DRAINAGE,
            "lang": "hi",
            "urgency": "high",
            "impact": "high",
            "rec": 4,
            "status": IncidentStatus.AWAITING_VERIFICATION,
            "sec": "Sector 26",
            "lm": "Grain Market Gate 2",
            "lat": 30.7262,
            "lon": 76.8048,
            "conf": 0.95,
            "cluster_id": cluster2.id,
            "days_ago": 3.0
        },
        {
            "num": "CP-2610-0105",
            "user_id": citizens[1].id,
            "title": "Series of broken streetlights causing complete pedestrian blackout",
            "desc": "Five consecutive street illumination poles have non-functional sodium lamps along the Sector 17 Plaza inner corridor. Pedestrians feel unsafe after 7:30 PM.",
            "raw": "Plaza walkway streetlights are all off for the past week. Very dark and unsafe.",
            "cat": IncidentCategory.STREETLIGHTS,
            "lang": "en",
            "urgency": "medium",
            "impact": "medium",
            "rec": 1,
            "status": IncidentStatus.RESOLVED,
            "sec": "Sector 17",
            "lm": "Near Central Plaza Fountain",
            "lat": 30.7402,
            "lon": 76.7790,
            "conf": 0.85,
            "cluster_id": None,
            "days_ago": 5.0
        },
        {
            "num": "CP-2610-0106",
            "user_id": citizens[3].id,
            "title": "Severe potable water pipeline leakage eroding road foundation",
            "desc": "Main clean drinking water supply line has burst underground in Manimajra near the community center. Thousands of liters of water are wasting and road is sinking.",
            "raw": "Manimajra community center de kol peen wale paani di pipeline fatt gayi hai.",
            "cat": IncidentCategory.WATER_SUPPLY,
            "lang": "pa",
            "urgency": "critical",
            "impact": "high",
            "rec": 1,
            "status": IncidentStatus.IN_PROGRESS,
            "sec": "Manimajra",
            "lm": "Near Housing Complex Community Hall",
            "lat": 30.7235,
            "lon": 76.8395,
            "conf": 0.94,
            "cluster_id": None,
            "days_ago": 1.5
        },
        {
            "num": "CP-2610-0107",
            "user_id": citizens[0].id,
            "title": "Damaged pedestrian median guard rail with exposed sharp iron",
            "desc": "Vehicular collision damaged the central divider railing on Madhya Marg. Sharp metal edges are jutting into the pedestrian refuge island.",
            "raw": "Central divider railing broken with sharp steel sticking out near bus stop.",
            "cat": IncidentCategory.INFRASTRUCTURE,
            "lang": "en",
            "urgency": "medium",
            "impact": "medium",
            "rec": 1,
            "status": IncidentStatus.REPORTED,
            "sec": "Sector 26",
            "lm": "Madhya Marg Bus Shelter",
            "lat": 30.7280,
            "lon": 76.8010,
            "conf": 0.80,
            "cluster_id": None,
            "days_ago": 0.4
        }
    ]

    created_incidents = []
    for inc_data in incident_data:
        loc = Location(
            sector=inc_data["sec"],
            landmark=inc_data["lm"],
            latitude=inc_data["lat"],
            longitude=inc_data["lon"],
            address=f"{inc_data['lm']}, {inc_data['sec']}, Chandigarh, UT",
            is_gps_verified=True,
            created_at=datetime.utcnow() - timedelta(days=inc_data["days_ago"])
        )
        db.add(loc)
        db.flush()

        priority_res = priority_calculator.calculate(
            urgency=inc_data["urgency"],
            impact=inc_data["impact"],
            recurrence_count=inc_data["rec"],
            unresolved_hours=inc_data["days_ago"] * 24.0,
            evidence_confidence=inc_data["conf"]
        )

        inc = Incident(
            incident_number=inc_data["num"],
            user_id=inc_data["user_id"],
            title=inc_data["title"],
            description=inc_data["desc"],
            raw_text=inc_data["raw"],
            category=inc_data["cat"],
            language=inc_data["lang"],
            urgency=inc_data["urgency"],
            impact=inc_data["impact"],
            recurrence_count=inc_data["rec"],
            priority_score=priority_res["score"],
            status=inc_data["status"],
            location_id=loc.id,
            evidence_confidence=inc_data["conf"],
            cluster_id=inc_data["cluster_id"],
            ai_extraction_meta={
                "nlp": {
                    "inferred_category": inc_data["cat"].value,
                    "detected_language": inc_data["lang"],
                    "urgency": inc_data["urgency"],
                    "confidence_score": inc_data["conf"]
                },
                "priority_factors": priority_res["breakdown"],
                "priority_explanation": priority_res["explanation"]
            },
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=inc_data["days_ago"]),
            updated_at=datetime.utcnow() - timedelta(days=inc_data["days_ago"] * 0.4)
        )
        db.add(inc)
        db.flush()
        created_incidents.append(inc)

    # 6. Seed Incident Relationships (Graph edges)
    rel1 = IncidentRelationship(
        source_incident_id=created_incidents[0].id,
        target_incident_id=created_incidents[1].id,
        relationship_type="recurring_pattern",
        confidence=0.86,
        explanation="Proximity within 140m in Sector 22 commercial belt; solid waste runoff continually clogs downstream roadside inlet.",
        distance_meters=140.0,
        is_verified=True,
        verified_by=admin_user.id
    )
    rel2 = IncidentRelationship(
        source_incident_id=created_incidents[3].id,
        target_incident_id=created_incidents[6].id,
        relationship_type="downstream_risk",
        confidence=0.79,
        explanation="Stormwater culvert backup in Sector 26 threatens sub-base stability along Madhya Marg corridor.",
        distance_meters=420.0,
        is_verified=True,
        verified_by=admin_user.id
    )
    db.add(rel1)
    db.add(rel2)

    # 7. Seed Work Assignments
    assign1 = WorkAssignment(
        incident_id=created_incidents[0].id,
        worker_id=worker1.id,
        assigned_by=admin_user.id,
        priority="critical",
        estimated_hours=4.0,
        status="assigned",
        notes="Urgent desilting suction tanker required at Aroma intersection.",
        assigned_at=datetime.utcnow() - timedelta(hours=6)
    )
    assign2 = WorkAssignment(
        incident_id=created_incidents[3].id,
        worker_id=worker1.id,
        assigned_by=admin_user.id,
        priority="high",
        estimated_hours=6.0,
        status="completed",
        notes="Cleared 4 tons of organic refuse from culvert mouth.",
        assigned_at=datetime.utcnow() - timedelta(days=2),
        completed_at=datetime.utcnow() - timedelta(hours=8)
    )
    assign3 = WorkAssignment(
        incident_id=created_incidents[4].id,
        worker_id=worker2.id,
        assigned_by=admin_user.id,
        priority="medium",
        estimated_hours=3.0,
        status="completed",
        notes="Replaced 5 LED fixture drivers and checked underground cables.",
        assigned_at=datetime.utcnow() - timedelta(days=4),
        completed_at=datetime.utcnow() - timedelta(days=3)
    )
    db.add(assign1)
    db.add(assign2)
    db.add(assign3)
    db.flush()

    # 8. Seed Resolution Submissions
    sub1 = ResolutionSubmission(
        incident_id=created_incidents[3].id,
        assignment_id=assign2.id,
        worker_id=worker1.id,
        before_photo_path="https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
        after_photo_path="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=600&auto=format&fit=crop&q=80",
        resolution_notes="Drainage culvert thoroughly cleaned with high-pressure water jet and mechanical backhoe. Flow restored to 100%.",
        validation_status="valid",
        validation_notes="Basic checks passed: Before and after photos present, timestamps aligned, location verified.",
        submitted_at=datetime.utcnow() - timedelta(hours=8)
    )
    sub2 = ResolutionSubmission(
        incident_id=created_incidents[4].id,
        assignment_id=assign3.id,
        worker_id=worker2.id,
        before_photo_path="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
        after_photo_path="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80",
        resolution_notes="Lamps replaced with new 90W Philips LED street fixtures. Illumination lux verified at 28 lux.",
        validation_status="valid",
        validation_notes="Verified by electrical sub-division supervisor.",
        submitted_at=datetime.utcnow() - timedelta(days=3)
    )
    db.add(sub1)
    db.add(sub2)

    # 9. Seed Citizen Reverification Feedback
    feedback1 = CitizenResolutionFeedback(
        incident_id=created_incidents[4].id,
        user_id=citizens[1].id,
        feedback_type="confirmed_resolved",
        comments="Walkway is brilliantly illuminated now. Thank you municipal electrical team!",
        submitted_at=datetime.utcnow() - timedelta(days=2.5)
    )
    db.add(feedback1)

    # 10. Seed Points Ledger & Badges
    ledger_items = [
        PointsLedger(user_id=citizens[0].id, points=10, reason_code="REPORT_VALID", description="Valid civic complaint registered (#CP-2610-0101)", reference_id=created_incidents[0].id, reference_type="incident"),
        PointsLedger(user_id=citizens[0].id, points=5, reason_code="EVIDENCE_PROVIDED", description="High clarity photographic documentation uploaded", reference_id=created_incidents[0].id, reference_type="incident"),
        PointsLedger(user_id=citizens[0].id, points=20, reason_code="RECURRING_DETECTIVE", description="Identified chronic Aroma Chowk drainage obstruction pattern", reference_id=cluster1.id, reference_type="cluster"),
        PointsLedger(user_id=citizens[1].id, points=10, reason_code="REPORT_VALID", description="Valid civic complaint registered (#CP-2610-0102)", reference_id=created_incidents[1].id, reference_type="incident"),
        PointsLedger(user_id=citizens[1].id, points=15, reason_code="RESOLUTION_VERIFIED", description="Report contributed to completed streetlight restoration", reference_id=created_incidents[4].id, reference_type="incident"),
        PointsLedger(user_id=citizens[1].id, points=3, reason_code="COMMUNITY_REVERIFY", description="Community verification confirmation submitted", reference_id=created_incidents[4].id, reference_type="feedback"),
        PointsLedger(user_id=citizens[3].id, points=10, reason_code="REPORT_VALID", description="Report registered (#CP-2610-0104)", reference_id=created_incidents[3].id, reference_type="incident"),
        PointsLedger(user_id=citizens[3].id, points=5, reason_code="EVIDENCE_PROVIDED", description="Evidence photo attached", reference_id=created_incidents[3].id, reference_type="incident"),
    ]
    for li in ledger_items:
        db.add(li)

    # User Badges
    all_b = db.query(Badge).all()
    b_map = {b.code: b.id for b in all_b}
    db.add(UserBadge(user_id=citizens[0].id, badge_id=b_map["VERIFIED_REPORTER"]))
    db.add(UserBadge(user_id=citizens[0].id, badge_id=b_map["EVIDENCE_CONTRIBUTOR"]))
    db.add(UserBadge(user_id=citizens[0].id, badge_id=b_map["RECURRING_DETECTIVE"]))
    db.add(UserBadge(user_id=citizens[1].id, badge_id=b_map["VERIFIED_REPORTER"]))
    db.add(UserBadge(user_id=citizens[1].id, badge_id=b_map["RESOLUTION_SUPPORTER"]))
    db.add(UserBadge(user_id=citizens[3].id, badge_id=b_map["COMMUNITY_GUARDIAN"]))

    # 11. Seed Notifications
    notifs = [
        Notification(user_id=citizens[0].id, title="Work Crew Assigned", message="Field team Alpha has been dispatched to inspect your drainage complaint #CP-2610-0101.", notification_type="status_change", incident_id=created_incidents[0].id),
        Notification(user_id=citizens[3].id, title="Action Required: Verify Resolution", message="Vikram Singh submitted resolution proof for #CP-2610-0104 in Sector 26. Please confirm if waterlogging is resolved.", notification_type="reverification", incident_id=created_incidents[3].id),
        Notification(user_id=citizens[1].id, title="Resolution Confirmed (+18 Points)", message="Streetlight repair verified. +15 points for verified resolution and +3 points for community feedback added to your ledger.", notification_type="reward", incident_id=created_incidents[4].id),
    ]
    for n in notifs:
        db.add(n)

    # 12. Seed Civic Intelligence Memory
    mem1 = CivicIntelligenceMemory(
        incident_id=created_incidents[0].id,
        sector="Sector 22",
        category=IncidentCategory.DRAINAGE,
        recurring_interval_days=4.5,
        past_resolution_count=3,
        failure_mode_notes="Chronic blockage recurrence: Desilting lasts only 4-6 days due to upstream food kiosk oil and plastic refuse dumping. Recommend installing grease trap.",
        recommended_infrastructure_inspection=True
    )
    db.add(mem1)

    # 13. Audit Log
    db.add(AuditLog(
        user_id=admin_user.id,
        action="SYSTEM_INITIALIZATION",
        target_type="system",
        target_id=None,
        details={"environment": "Chandigarh Demonstration Sandbox", "synthetic_incidents": len(created_incidents)}
    ))

    db.commit()

if __name__ == "__main__":
    from app.database import SessionLocal, Base, engine
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db, wipe_existing=True)
    db.close()
    print("Database successfully seeded with realistic Chandigarh civic data!")
