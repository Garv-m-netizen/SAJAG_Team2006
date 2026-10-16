from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (
    Incident, CivicIntelligenceMemory, Location,
    ResolutionSubmission, IncidentStatus, IncidentCategory
)

class CivicIntelligenceMemoryService:
    """
    Maintains persistent memory of recurring civic patterns across Chandigarh.
    Correlates recurring issues with previous resolutions, failure intervals,
    and recommends underlying infrastructure/scheduling investigations.
    """

    def record_or_update_memory(
        self,
        db: Session,
        incident: Incident
    ) -> Optional[CivicIntelligenceMemory]:
        # Search for past incidents in the same sector & category
        past_incidents = db.query(Incident).join(Location).filter(
            Incident.id != incident.id,
            Incident.category == incident.category,
            Location.sector == incident.location.sector
        ).order_by(Incident.created_at.desc()).all()

        if not past_incidents:
            return None

        # Calculate recurrence interval
        latest_past = past_incidents[0]
        interval_days = round(abs((incident.created_at - latest_past.created_at).total_seconds()) / 86400.0, 1)

        # Count how many past instances were marked resolved
        past_resolved_count = sum(1 for p in past_incidents if p.status == IncidentStatus.RESOLVED)

        # Assess failure mode
        failure_notes = []
        rec_inspection = False

        if interval_days < 7.0 and past_resolved_count >= 1:
            failure_notes.append(
                f"Chronic failure pattern: Reappeared within {interval_days} days after previous resolution. "
                "Immediate root-cause failure analysis recommended over routine cleanup."
            )
            rec_inspection = True
        elif past_resolved_count >= 2:
            failure_notes.append(
                f"Recurrent hotspot: Resolved {past_resolved_count} times previously in {incident.location.sector}. "
                "Suggest adjusting municipal collection schedule or inspecting subsurface drainage conduits."
            )
            rec_inspection = True
        else:
            failure_notes.append(f"Observed recurrence interval: {interval_days} days.")

        memory = CivicIntelligenceMemory(
            incident_id=incident.id,
            sector=incident.location.sector,
            category=incident.category,
            recurring_interval_days=interval_days,
            past_resolution_count=past_resolved_count,
            failure_mode_notes="; ".join(failure_notes),
            recommended_infrastructure_inspection=rec_inspection,
            created_at=datetime.utcnow()
        )
        db.add(memory)
        db.commit()
        return memory

    def get_incident_memory(self, db: Session, incident_id: int) -> List[Dict[str, Any]]:
        memories = db.query(CivicIntelligenceMemory).filter(
            CivicIntelligenceMemory.incident_id == incident_id
        ).all()

        results = []
        for m in memories:
            results.append({
                "id": m.id,
                "incident_id": m.incident_id,
                "sector": m.sector,
                "category": m.category.value,
                "recurring_interval_days": m.recurring_interval_days,
                "past_resolution_count": m.past_resolution_count,
                "failure_mode_notes": m.failure_mode_notes,
                "recommended_infrastructure_inspection": m.recommended_infrastructure_inspection,
                "created_at": m.created_at.isoformat()
            })
        return results

memory_service = CivicIntelligenceMemoryService()
