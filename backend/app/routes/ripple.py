from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import RiskAssessmentOut, RippleScenarioRequest
from app.services.ripple_engine import ripple_engine, weather_provider

router = APIRouter(prefix="/ripple", tags=["Ripple Intelligence"])

@router.get("/scenarios")
def get_weather_scenarios():
    """
    Returns available synthetic weather scenarios for demonstration.
    """
    return [
        {
            "id": k,
            "name": v["name"],
            "rainfall_mm": v["rainfall_mm"],
            "risk_multiplier": v["risk_multiplier"],
            "description": v["description"]
        }
        for k, v in weather_provider.SCENARIOS.items()
    ]

@router.post("/assess", response_model=List[RiskAssessmentOut])
def assess_downstream_risks(
    request: RippleScenarioRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Runs risk analysis engine for potential downstream civic consequences under the chosen weather scenario.
    """
    risks = ripple_engine.analyze_ripple_risks(
        db,
        scenario_key=request.scenario_name,
        sector_filter=request.sector_filter
    )
    return risks
