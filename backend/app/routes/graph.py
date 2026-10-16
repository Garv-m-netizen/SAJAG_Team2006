from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import GraphDataOut
from app.services.graph_service import graph_service

router = APIRouter(prefix="/graph", tags=["Incident Graph"])

@router.get("/topology", response_model=GraphDataOut)
def get_graph_topology(
    sector: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns NetworkX-generated topological graph of incidents, clusters, and infrastructure.
    """
    data = graph_service.build_network_graph(
        db,
        sector_filter=sector,
        category_filter=category,
        status_filter=status
    )
    return data
