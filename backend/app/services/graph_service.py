import math
from typing import List, Dict, Any, Optional
import networkx as nx
from sqlalchemy.orm import Session
from app.models import (
    Incident, IncidentCluster, InfrastructureAsset,
    IncidentRelationship, Location, IncidentStatus
)

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two coordinates."""
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def text_token_similarity(text1: str, text2: str) -> float:
    """Calculate word token Jaccard similarity."""
    tokens1 = set([w.strip().lower() for w in text1.split() if len(w) > 2])
    tokens2 = set([w.strip().lower() for w in text2.split() if len(w) > 2])
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

class CivicGraphService:
    """
    NetworkX-backed incident graph service for CivicPulse AI.
    Builds connected intelligence graph with nodes (Incidents, Clusters, Infrastructure, Hubs)
    and edges (Duplicate, Recurring Pattern, Downstream Risk, Infrastructure Adjacent).
    """

    def build_network_graph(
        self,
        db: Session,
        sector_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        G = nx.Graph()

        # Query incidents
        query = db.query(Incident).join(Location)
        if sector_filter and sector_filter.lower() != "all":
            query = query.filter(Location.sector == sector_filter)
        if category_filter and category_filter.lower() != "all":
            query = query.filter(Incident.category == category_filter)
        if status_filter and status_filter.lower() != "all":
            query = query.filter(Incident.status == status_filter)

        incidents: List[Incident] = query.limit(100).all()

        # Query Infrastructure assets
        infra_query = db.query(InfrastructureAsset)
        if sector_filter and sector_filter.lower() != "all":
            infra_query = infra_query.filter(InfrastructureAsset.sector == sector_filter)
        assets: List[InfrastructureAsset] = infra_query.limit(40).all()

        # Query Clusters
        cluster_query = db.query(IncidentCluster)
        if sector_filter and sector_filter.lower() != "all":
            cluster_query = cluster_query.filter(IncidentCluster.sector == sector_filter)
        clusters: List[IncidentCluster] = cluster_query.all()

        # Add Incident nodes
        for inc in incidents:
            node_id = f"inc_{inc.id}"
            eff_priority = inc.priority_override if inc.priority_override is not None else inc.priority_score
            G.add_node(
                node_id,
                label=f"#{inc.incident_number}",
                type="incident",
                category=inc.category.value,
                status=inc.status.value,
                sector=inc.location.sector,
                priority=eff_priority,
                latitude=inc.location.latitude,
                longitude=inc.location.longitude,
                metadata={
                    "id": inc.id,
                    "title": inc.title,
                    "description": inc.description[:120] + "...",
                    "urgency": inc.urgency,
                    "impact": inc.impact,
                    "is_synthetic": inc.is_synthetic,
                    "created_at": inc.created_at.isoformat()
                }
            )

        # Add Cluster nodes
        for cl in clusters:
            node_id = f"cl_{cl.id}"
            G.add_node(
                node_id,
                label=f"Cluster: {cl.cluster_name}",
                type="cluster",
                category=cl.category.value,
                status=cl.status,
                sector=cl.sector,
                priority=75.0,
                latitude=None,
                longitude=None,
                metadata={
                    "id": cl.id,
                    "recurring_count": cl.recurring_count,
                    "first_reported": cl.first_reported_at.isoformat(),
                    "last_reported": cl.last_reported_at.isoformat()
                }
            )

        # Add Infrastructure nodes
        for asset in assets:
            node_id = f"asset_{asset.id}"
            G.add_node(
                node_id,
                label=f"Infra: {asset.name}",
                type="infrastructure",
                category=asset.asset_type,
                status="operational",
                sector=asset.sector,
                priority=asset.vulnerability_rating * 100,
                latitude=asset.latitude,
                longitude=asset.longitude,
                metadata={
                    "id": asset.id,
                    "criticality": asset.criticality,
                    "vulnerability": asset.vulnerability_rating,
                    "notes": asset.notes
                }
            )

        # 1. Add edges from stored IncidentRelationship table
        inc_ids = [inc.id for inc in incidents]
        if inc_ids:
            stored_rels = db.query(IncidentRelationship).filter(
                (IncidentRelationship.source_incident_id.in_(inc_ids)) |
                (IncidentRelationship.target_incident_id.in_(inc_ids))
            ).all()

            for rel in stored_rels:
                src = f"inc_{rel.source_incident_id}"
                tgt = f"inc_{rel.target_incident_id}"
                if G.has_node(src) and G.has_node(tgt):
                    G.add_edge(
                        src, tgt,
                        relationship=rel.relationship_type,
                        confidence=rel.confidence,
                        explanation=rel.explanation
                    )

        # 2. Add Cluster membership edges
        for inc in incidents:
            if inc.cluster_id:
                cl_node = f"cl_{inc.cluster_id}"
                if G.has_node(cl_node):
                    G.add_edge(
                        f"inc_{inc.id}", cl_node,
                        relationship="member_of",
                        confidence=0.95,
                        explanation=f"Incident #{inc.incident_number} belongs to recurring cluster #{inc.cluster_id}"
                    )

        # 3. Dynamic proximity & Infrastructure adjacency calculation
        for inc in incidents:
            for asset in assets:
                dist = haversine_distance_meters(
                    inc.location.latitude, inc.location.longitude,
                    asset.latitude, asset.longitude
                )
                if dist <= 450:  # within 450m of critical infrastructure
                    edge_key = (f"inc_{inc.id}", f"asset_{asset.id}")
                    if not G.has_edge(*edge_key):
                        G.add_edge(
                            edge_key[0], edge_key[1],
                            relationship="infrastructure_adjacent",
                            confidence=round(max(0.60, 1.0 - (dist / 600.0)), 2),
                            explanation=f"Incident within {int(dist)}m of {asset.name} in {asset.sector}; potential localized impact."
                        )

        # Format output for frontend visualization
        nodes_list = []
        for n, d in G.nodes(data=True):
            nodes_list.append({
                "id": n,
                "label": d.get("label", n),
                "type": d.get("type", "incident"),
                "category": d.get("category"),
                "status": d.get("status"),
                "sector": d.get("sector"),
                "priority": d.get("priority", 50.0),
                "latitude": d.get("latitude"),
                "longitude": d.get("longitude"),
                "metadata": d.get("metadata", {})
            })

        edges_list = []
        for u, v, d in G.edges(data=True):
            edges_list.append({
                "source": u,
                "target": v,
                "relationship": d.get("relationship", "related"),
                "confidence": d.get("confidence", 0.70),
                "explanation": d.get("explanation", "Linked via civic topology")
            })

        # Calculate network metrics
        connected_components_count = nx.number_connected_components(G) if len(G) > 0 else 0
        density = round(nx.density(G), 3) if len(G) > 1 else 0.0

        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "stats": {
                "total_nodes": G.number_of_nodes(),
                "total_edges": G.number_of_edges(),
                "connected_clusters": connected_components_count,
                "graph_density": density
            }
        }

    def detect_potential_duplicate_or_cluster(
        self,
        db: Session,
        new_inc: Incident,
        new_lat: float,
        new_lon: float
    ) -> List[Dict[str, Any]]:
        """
        Detects potential duplicate reports and recurring clusters for a newly submitted incident.
        Uses geographic distance (< 350m) and text similarity.
        """
        candidates = db.query(Incident).join(Location).filter(
            Incident.id != new_inc.id,
            Incident.category == new_inc.category,
            Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.REJECTED])
        ).all()

        suggestions = []
        for cand in candidates:
            dist = haversine_distance_meters(
                new_lat, new_lon,
                cand.location.latitude, cand.location.longitude
            )
            sim = text_token_similarity(new_inc.description, cand.description)

            if dist <= 300 and sim >= 0.20:
                confidence = round(min(0.95, 0.45 + (1 - dist / 300) * 0.35 + sim * 0.20), 2)
                suggestions.append({
                    "target_incident_id": cand.id,
                    "target_incident_number": cand.incident_number,
                    "distance_meters": round(dist, 1),
                    "text_similarity": round(sim, 2),
                    "confidence": confidence,
                    "relationship_type": "duplicate" if dist <= 120 and sim >= 0.35 else "recurring_pattern",
                    "explanation": f"Located {int(dist)}m away in {cand.location.sector} with {int(sim*100)}% vocabulary overlap in complaint descriptions."
                })

        return sorted(suggestions, key=lambda x: x["confidence"], reverse=True)

graph_service = CivicGraphService()
