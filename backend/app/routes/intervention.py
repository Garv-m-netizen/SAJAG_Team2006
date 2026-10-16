from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole
from app.schemas import InterventionRequest, InterventionPlanOut
from app.auth import require_role
from app.services.intervention_sim import intervention_simulator

router = APIRouter(prefix="/intervention", tags=["Intervention Simulator"])

@router.post("/simulate", response_model=InterventionPlanOut)
def run_intervention_simulation(
    request: InterventionRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Executes resource-constrained optimization for municipal crew dispatch.
    Returns recommended assignments, estimated costs, and remaining residual risks.
    """
    plan = intervention_simulator.simulate(
        db,
        available_crews=request.available_crews,
        budget_inr=request.budget_inr,
        time_hours=request.time_hours,
        weather_scenario=request.weather_scenario
    )
    return plan
