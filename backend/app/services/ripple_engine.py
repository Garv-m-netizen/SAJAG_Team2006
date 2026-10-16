from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (
    Incident, InfrastructureAsset, Location,
    RiskAssessment, IncidentCategory, IncidentStatus
)
from app.services.graph_service import haversine_distance_meters

class WeatherScenarioProvider:
    """
    Pluggable weather scenario provider interface.
    Returns simulated weather profiles today; easily swappable with IMD (India Meteorological Dept) or OpenWeather API.
    """
    SCENARIOS = {
        "dry_weather": {
            "name": "Dry Weather",
            "rainfall_mm": 0.0,
            "soil_saturation_pct": 15,
            "wind_speed_kmh": 8,
            "risk_multiplier": 1.0,
            "description": "Clear skies, typical summer/winter dry period in Chandigarh."
        },
        "moderate_rain": {
            "name": "Moderate Monsoon Shower",
            "rainfall_mm": 35.0,
            "soil_saturation_pct": 65,
            "wind_speed_kmh": 24,
            "risk_multiplier": 1.8,
            "description": "Pre-monsoon / steady afternoon rain; stormwater systems at 60% capacity."
        },
        "heavy_monsoon": {
            "name": "Heavy Monsoon Cloudburst",
            "rainfall_mm": 95.0,
            "soil_saturation_pct": 92,
            "wind_speed_kmh": 45,
            "risk_multiplier": 3.2,
            "description": "Intense torrential downpour exceeding 90mm/hr; high risk of underpass flooding."
        }
    }

    def get_scenario(self, key: str = "moderate_rain") -> Dict[str, Any]:
        return self.SCENARIOS.get(key, self.SCENARIOS["moderate_rain"])

weather_provider = WeatherScenarioProvider()

class CivicRippleEngine:
    """
    Analyzes downstream cascading risks by combining:
    1. Active incidents (blockages, potholes, damaged poles)
    2. Nearby vulnerable infrastructure (underpasses, culverts, hospitals, roundabouts)
    3. Weather scenario multiplier (Dry, Moderate Rain, Heavy Monsoon)
    """

    def analyze_ripple_risks(
        self,
        db: Session,
        scenario_key: str = "moderate_rain",
        sector_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        scenario = weather_provider.get_scenario(scenario_key)
        multiplier = scenario["risk_multiplier"]

        # Fetch open incidents
        inc_query = db.query(Incident).join(Location).filter(
            Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED])
        )
        if sector_filter and sector_filter.lower() != "all":
            inc_query = inc_query.filter(Location.sector == sector_filter)
        incidents = inc_query.all()

        # Fetch infrastructure assets
        infra_query = db.query(InfrastructureAsset)
        if sector_filter and sector_filter.lower() != "all":
            infra_query = infra_query.filter(InfrastructureAsset.sector == sector_filter)
        assets = infra_query.all()

        risks: List[Dict[str, Any]] = []

        # Rule 1: Drainage / Garbage incident near Underpass or Stormwater Culvert
        for asset in assets:
            if asset.asset_type in ["underpass", "stormwater_culvert", "drainage_canal"]:
                nearby_clogs = []
                for inc in incidents:
                    if inc.category in [IncidentCategory.DRAINAGE, IncidentCategory.GARBAGE]:
                        dist = haversine_distance_meters(
                            inc.location.latitude, inc.location.longitude,
                            asset.latitude, asset.longitude
                        )
                        if dist <= 600:
                            nearby_clogs.append((inc, dist))

                if nearby_clogs:
                    clog_count = len(nearby_clogs)
                    base_score = 40.0 + min(30.0, clog_count * 15.0) + (asset.vulnerability_rating * 20.0)
                    scaled_score = min(98.0, round(base_score * multiplier, 1))

                    severity = "critical" if scaled_score >= 80 else ("high" if scaled_score >= 60 else "medium")
                    inc_refs = [c[0].id for c in nearby_clogs]
                    evidence = [
                        f"{len(nearby_clogs)} unresolved blockage/sanitation reports within 600m of {asset.name}",
                        f"Infrastructure baseline vulnerability: {round(asset.vulnerability_rating * 100)}%",
                        f"Current simulated rainfall stress: {scenario['rainfall_mm']}mm ({scenario['name']})"
                    ]

                    risks.append({
                        "id": len(risks) + 1,
                        "scenario_name": scenario_key,
                        "risk_type": f"Underpass Waterlogging & Traffic Snarl at {asset.name}",
                        "sector": asset.sector,
                        "severity": severity,
                        "score": scaled_score,
                        "relationship_type": "inferred_relationship",
                        "supporting_evidence": evidence,
                        "assumptions": [
                            "Stormwater runoff coefficient assumed at 0.75 for paved roadways",
                            "Drainage cross-section obstructed by accumulated debris"
                        ],
                        "missing_information": "Real-time telemetry water-level sensor reading",
                        "recommended_action": f"Immediate mechanized desilting of culverts surrounding {asset.name} prior to peak rain.",
                        "incident_ids": inc_refs,
                        "infrastructure_name": asset.name,
                        "requires_inspection": True,
                        "confidence_rating": 0.88,
                        "is_simulated": True,
                        "created_at": datetime.utcnow().isoformat()
                    })

            # Rule 2: Damaged Streetlights or Potholes near pedestrian zones or roundabouts
            elif asset.asset_type in ["roundabout", "pedestrian_zone", "hospital_approach"]:
                hazard_reports = []
                for inc in incidents:
                    if inc.category in [IncidentCategory.POTHOLES, IncidentCategory.STREETLIGHTS, IncidentCategory.TRAFFIC_SAFETY]:
                        dist = haversine_distance_meters(
                            inc.location.latitude, inc.location.longitude,
                            asset.latitude, asset.longitude
                        )
                        if dist <= 400:
                            hazard_reports.append((inc, dist))

                if hazard_reports:
                    base_score = 35.0 + min(30.0, len(hazard_reports) * 12.0)
                    weather_extra = 1.2 if scenario_key == "heavy_monsoon" else 1.0
                    scaled_score = min(92.0, round(base_score * weather_extra, 1))
                    severity = "high" if scaled_score >= 65 else "medium"

                    risks.append({
                        "id": len(risks) + 1,
                        "scenario_name": scenario_key,
                        "risk_type": f"Pedestrian Safety & Collision Hazard near {asset.name}",
                        "sector": asset.sector,
                        "severity": severity,
                        "score": scaled_score,
                        "relationship_type": "observed_relationship",
                        "supporting_evidence": [
                            f"{len(hazard_reports)} roadway/illumination hazards detected within 400m of {asset.name}",
                            f"Location serves as major transit/crossing hub in {asset.sector}"
                        ],
                        "assumptions": [
                            "Reduced driver visibility during evening hours combined with surface road defects"
                        ],
                        "missing_information": "Police traffic accident registry cross-feed",
                        "recommended_action": "Deploy rapid road patch crew and inspect illumination feeder pillar.",
                        "incident_ids": [h[0].id for h in hazard_reports],
                        "infrastructure_name": asset.name,
                        "requires_inspection": True,
                        "confidence_rating": 0.82,
                        "is_simulated": True,
                        "created_at": datetime.utcnow().isoformat()
                    })

        # Sort risks descending by risk score
        return sorted(risks, key=lambda x: x["score"], reverse=True)

ripple_engine = CivicRippleEngine()
