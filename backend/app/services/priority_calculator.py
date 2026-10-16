from typing import Dict, Any

class PriorityCalculator:
    """
    Transparent civic incident priority calculator.
    Considers Impact, Urgency, Recurrence, Duration, and Evidence Confidence.
    Guarantees first-time critical emergencies receive priority >= 80 regardless of recurrence.
    """

    URGENCY_WEIGHTS = {
        "critical": 1.0,
        "high": 0.75,
        "medium": 0.45,
        "low": 0.20
    }

    IMPACT_WEIGHTS = {
        "high": 1.0,
        "medium": 0.55,
        "low": 0.25
    }

    def calculate(
        self,
        urgency: str = "medium",
        impact: str = "medium",
        recurrence_count: int = 1,
        unresolved_hours: float = 0.0,
        evidence_confidence: float = 0.70
    ) -> Dict[str, Any]:
        u_val = self.URGENCY_WEIGHTS.get(urgency.lower(), 0.45)
        i_val = self.IMPACT_WEIGHTS.get(impact.lower(), 0.55)

        # Recurrence boost: scales up to +0.25 for repeat offenses (1 to 5+)
        rec_boost = min(0.25, max(0.0, (recurrence_count - 1) * 0.06))

        # Unresolved duration boost: scales up to +0.15 for older unresolved issues
        dur_val = min(0.15, (unresolved_hours / 72.0) * 0.15)

        # Evidence confidence weight: up to +0.10
        ev_val = max(0.0, min(0.10, (evidence_confidence - 0.5) * 0.20))

        # Formula: Base Urgency (35%) + Impact (30%) + Recurrence (15%) + Duration (10%) + Evidence (10%)
        raw_score = (u_val * 0.35 + i_val * 0.30 + rec_boost * 0.15 + dur_val * 0.10 + ev_val * 0.10) * 100

        # Safety override constraint: Critical emergency floor is 80.0
        if urgency.lower() == "critical":
            final_score = max(80.0, min(99.0, raw_score + 15.0))
        elif urgency.lower() == "high":
            final_score = max(60.0, min(95.0, raw_score))
        else:
            final_score = max(10.0, min(90.0, raw_score))

        final_score = round(final_score, 1)

        # Build detailed human explanation
        explanation_parts = [
            f"Urgency assessment '{urgency.upper()}' contributes {round(u_val * 35, 1)} pts",
            f"Impact scale '{impact.upper()}' contributes {round(i_val * 30, 1)} pts",
        ]
        if recurrence_count > 1:
            explanation_parts.append(f"Repeat incident count ({recurrence_count}x) adds +{round(rec_boost * 15, 1)} recurrence boost")
        if unresolved_hours > 12:
            explanation_parts.append(f"Unresolved aging ({round(unresolved_hours, 1)} hrs) adds +{round(dur_val * 10, 1)} duration urgency")
        if evidence_confidence >= 0.7:
            explanation_parts.append(f"High evidence confidence ({round(evidence_confidence*100)}%) validates report priority")

        return {
            "score": final_score,
            "breakdown": {
                "urgency_component": round(u_val * 35, 1),
                "impact_component": round(i_val * 30, 1),
                "recurrence_boost": round(rec_boost * 15, 1),
                "duration_component": round(dur_val * 10, 1),
                "evidence_component": round(ev_val * 10, 1),
            },
            "explanation": "; ".join(explanation_parts) + f". Final calculated priority: {final_score}/100."
        }

priority_calculator = PriorityCalculator()
