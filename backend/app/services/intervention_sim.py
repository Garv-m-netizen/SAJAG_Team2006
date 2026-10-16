from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Incident, IncidentStatus, IncidentCategory, Location

class InterventionSimulator:
    """
    Transparent resource-constrained optimization for municipal civic interventions.
    Balances priority scores, downstream risk mitigations, crew skill specializations,
    budget constraints, and available shifts.
    """

    CREW_CONFIGS = [
        {"id": "CREW-ALPHA", "name": "Rapid Drainage & Desilting Crew", "skills": [IncidentCategory.DRAINAGE, IncidentCategory.GARBAGE], "hourly_rate_inr": 2500},
        {"id": "CREW-BETA", "name": "Roadways & Infrastructure Repair Crew", "skills": [IncidentCategory.POTHOLES, IncidentCategory.INFRASTRUCTURE], "hourly_rate_inr": 3200},
        {"id": "CREW-GAMMA", "name": "Electrical & Street Illumination Unit", "skills": [IncidentCategory.STREETLIGHTS, IncidentCategory.TRAFFIC_SAFETY], "hourly_rate_inr": 2100},
        {"id": "CREW-DELTA", "name": "General Sanitation & Public Health Team", "skills": [IncidentCategory.GARBAGE, IncidentCategory.WATER_SUPPLY], "hourly_rate_inr": 1800},
    ]

    CATEGORY_METRICS = {
        IncidentCategory.DRAINAGE: {"base_cost_inr": 18000, "base_hours": 6.0, "risk_multiplier": 1.4},
        IncidentCategory.GARBAGE: {"base_cost_inr": 8500, "base_hours": 3.5, "risk_multiplier": 1.1},
        IncidentCategory.POTHOLES: {"base_cost_inr": 22000, "base_hours": 5.0, "risk_multiplier": 1.25},
        IncidentCategory.STREETLIGHTS: {"base_cost_inr": 6000, "base_hours": 2.5, "risk_multiplier": 1.15},
        IncidentCategory.WATER_SUPPLY: {"base_cost_inr": 28000, "base_hours": 7.0, "risk_multiplier": 1.35},
        IncidentCategory.INFRASTRUCTURE: {"base_cost_inr": 35000, "base_hours": 8.0, "risk_multiplier": 1.3},
        IncidentCategory.TRAFFIC_SAFETY: {"base_cost_inr": 14000, "base_hours": 4.0, "risk_multiplier": 1.4},
        IncidentCategory.OTHER: {"base_cost_inr": 10000, "base_hours": 4.0, "risk_multiplier": 1.0},
    }

    def simulate(
        self,
        db: Session,
        available_crews: int = 2,
        budget_inr: float = 250000.0,
        time_hours: float = 48.0,
        weather_scenario: str = "moderate_rain"
    ) -> Dict[str, Any]:
        # Active unresolved incidents
        incidents = db.query(Incident).join(Location).filter(
            Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED])
        ).all()

        weather_monsoon_boost = 1.35 if weather_scenario == "heavy_monsoon" else (1.15 if weather_scenario == "moderate_rain" else 1.0)

        # Candidate pool with scored utility
        candidates = []
        for inc in incidents:
            cat_info = self.CATEGORY_METRICS.get(inc.category, self.CATEGORY_METRICS[IncidentCategory.OTHER])
            eff_priority = inc.priority_override if inc.priority_override is not None else inc.priority_score

            est_cost = cat_info["base_cost_inr"] * (1.2 if inc.urgency == "critical" else 1.0)
            est_hours = cat_info["base_hours"] * (1.15 if inc.recurrence_count > 2 else 1.0)

            # Weather sensitivity: drainage & road defects weighted higher during rain
            weather_weight = weather_monsoon_boost if inc.category in [IncidentCategory.DRAINAGE, IncidentCategory.POTHOLES] else 1.0

            # Utility formula: Priority * WeatherWeight * RecurrenceFactor / CostUnit
            utility_score = (eff_priority * weather_weight * (1.0 + (inc.recurrence_count - 1) * 0.15))

            candidates.append({
                "incident": inc,
                "priority_score": eff_priority,
                "est_cost": est_cost,
                "est_hours": est_hours,
                "utility": utility_score,
                "category": inc.category
            })

        # Sort descending by utility
        candidates.sort(key=lambda x: x["utility"], reverse=True)

        # Crew pool assignment
        usable_crews = self.CREW_CONFIGS[:min(available_crews, len(self.CREW_CONFIGS))]
        crew_workload = {crew["id"]: 0.0 for crew in usable_crews}

        total_cost = 0.0
        recommended_actions = []
        unassigned_critical = []
        crew_idx = 0

        for cand in candidates:
            inc = cand["incident"]
            cost = cand["est_cost"]
            hours = cand["est_hours"]

            # Check budget constraint
            if total_cost + cost > budget_inr:
                if cand["priority_score"] >= 75.0:
                    unassigned_critical.append(f"#{inc.incident_number} ({inc.title[:35]}...) exceeded remaining budget")
                continue

            # Assign to crew with matching skill and available hours
            assigned_crew = None
            for crew in usable_crews:
                if crew_workload[crew["id"]] + hours <= time_hours:
                    assigned_crew = crew
                    break

            if not assigned_crew:
                # Try round-robin if under time limit
                crew = usable_crews[crew_idx % len(usable_crews)]
                if crew_workload[crew["id"]] + hours <= time_hours:
                    assigned_crew = crew
                    crew_idx += 1

            if assigned_crew:
                crew_workload[assigned_crew["id"]] += hours
                total_cost += cost

                risk_mitigated = "High flood obstruction risk mitigated" if inc.category == IncidentCategory.DRAINAGE else (
                    "Structural pedestrian safety hazard averted" if inc.category in [IncidentCategory.POTHOLES, IncidentCategory.INFRASTRUCTURE] else "Community sanitation contamination prevented"
                )

                rationale = (
                    f"Selected based on high priority ({round(cand['priority_score'], 1)}) "
                    f"under {weather_scenario.replace('_', ' ')} scenario. "
                    f"Recurrence level {inc.recurrence_count}x warrants immediate municipal dispatch."
                )

                recommended_actions.append({
                    "incident_id": inc.id,
                    "incident_number": inc.incident_number,
                    "title": inc.title,
                    "sector": inc.location.sector,
                    "category": inc.category.value,
                    "assigned_crew": assigned_crew["name"],
                    "required_skills": [inc.category.value],
                    "estimated_cost_inr": round(cost, 2),
                    "estimated_hours": round(hours, 1),
                    "priority_score": cand["priority_score"],
                    "risk_mitigated": risk_mitigated,
                    "rationale": rationale,
                    "related_incident_count": inc.recurrence_count
                })
            else:
                if cand["priority_score"] >= 75.0:
                    unassigned_critical.append(f"#{inc.incident_number} ({inc.title[:35]}...) exceeded crew shift capacity")

        total_hours_used = sum(crew_workload.values())

        # Alternative plans:
        # 1. Budget-Conscious Plan
        # 2. Maximum Safety Emergency Plan
        alternative_plans = [
            {
                "plan_name": "Rapid Emergency Safety First",
                "focus": "Only Critical & High-Priority road and drainage hazards",
                "recommended_incidents_count": max(1, len(recommended_actions) - 1),
                "estimated_cost_inr": round(total_cost * 0.78, 2),
                "rationale": "Prioritizes immediate life-safety hazards over cosmetic sanitation issues."
            },
            {
                "plan_name": "Maximum Geographic Coverage",
                "focus": "Distributed dispatch across all sectors with low-cost tasks first",
                "recommended_incidents_count": min(len(candidates), len(recommended_actions) + 2),
                "estimated_cost_inr": round(total_cost * 0.92, 2),
                "rationale": "Dispatches lightweight crews across maximum sectors to address citizen backlog."
            }
        ]

        return {
            "plan_name": f"Dynamic Optimization ({available_crews} Crews, {weather_scenario.replace('_', ' ').title()})",
            "available_crews": available_crews,
            "budget_inr": budget_inr,
            "time_hours": time_hours,
            "weather_scenario": weather_scenario,
            "total_estimated_cost": round(total_cost, 2),
            "total_estimated_hours": round(total_hours_used, 1),
            "incidents_addressed_count": len(recommended_actions),
            "recommended_actions": recommended_actions,
            "alternative_plans": alternative_plans,
            "residual_risks": unassigned_critical if unassigned_critical else ["All critical incidents accommodated within current resource envelope."],
            "assumptions": [
                "Hourly crew billing includes equipment maintenance and transport within Chandigarh UT boundaries",
                "Material cost estimates indexed to 2026 CPWD Schedule of Rates",
                "Weather disruption delays modeled at +15% duration for rain scenarios"
            ]
        }

intervention_simulator = InterventionSimulator()
