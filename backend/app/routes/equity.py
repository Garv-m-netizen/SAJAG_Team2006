from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import CivicEquityOverviewOut
from app.services.equity_service import equity_service

router = APIRouter(prefix="/equity", tags=["Civic Equity"])

@router.get("/overview", response_model=CivicEquityOverviewOut)
def get_equity_overview(db: Session = Depends(get_db)):
    """
    Returns neighborhood-level equity indicators, resolution delays, recurrence hotspots,
    and explanations for flagged underserved sectors.
    """
    return equity_service.analyze_equity(db)
