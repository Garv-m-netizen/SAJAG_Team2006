from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (
    Incident, Location, InfrastructureAsset,
    IncidentStatus, IncidentCluster
)

CHANDIGARH_SECTORS = [
    "Sector 17", "Sector 22", "Sector 26", "Sector 35",
    "Sector 43", "Sector 45", "Manimajra", "Industrial Area Phase 1"
]

class CivicEquityService:
    """
    Analyzes municipal service equity across Chandigarh neighborhoods.
    Identifies potentially neglected sectors without equating low complaint count to satisfaction.
    """

    def analyze_equity(self, db: Session) -> Dict[str, Any]:
        all_incidents = db.query(Incident).join(Location).all()
        all_infra = db.query(InfrastructureAsset).all()
        all_clusters = db.query(IncidentCluster).all()

        sector_data: Dict[str, Dict[str, Any]] = {}
        for s in CHANDIGARH_SECTORS:
            sector_data[s] = {
                "sector": s,
                "total_reported": 0,
                "unresolved_count": 0,
                "recurring_hotspots_count": 0,
                "resolution_durations_hrs": [],
                "severe_unresolved_count": 0,
                "infrastructure_vulnerabilities": 0,
                "last_inspection_days_ago": 30
            }

        for inc in all_incidents:
            sec = inc.location.sector
            if sec not in sector_data:
                sector_data[sec] = {
                    "sector": sec,
                    "total_reported": 0,
                    "unresolved_count": 0,
                    "recurring_hotspots_count": 0,
                    "resolution_durations_hrs": [],
                    "severe_unresolved_count": 0,
                    "infrastructure_vulnerabilities": 0,
                    "last_inspection_days_ago": 30
                }

            sector_data[sec]["total_reported"] += 1

            if inc.status not in [IncidentStatus.RESOLVED, IncidentStatus.REJECTED]:
                sector_data[sec]["unresolved_count"] += 1
                if inc.urgency in ["critical", "high"]:
                    sector_data[sec]["severe_unresolved_count"] += 1
            else:
                # Calculate resolution duration in hours
                dur = (inc.updated_at - inc.created_at).total_seconds() / 3600.0
                sector_data[sec]["resolution_durations_hrs"].append(max(2.0, dur))

        # Infrastructure vulnerability tally
        for inf in all_infra:
            if inf.sector in sector_data and inf.vulnerability_rating >= 0.6:
                sector_data[inf.sector]["infrastructure_vulnerabilities"] += 1

        # Clusters tally
        for cl in all_clusters:
            if cl.sector in sector_data and cl.recurring_count >= 2:
                sector_data[cl.sector]["recurring_hotspots_count"] += 1

        # City-wide avg resolution hours
        all_durations = [d for s in sector_data.values() for d in s["resolution_durations_hrs"]]
        city_avg_hrs = round(sum(all_durations) / len(all_durations), 1) if all_durations else 36.0

        metrics_list = []
        flagged_count = 0
        highest_neglect_sector = "None"
        max_neglect_score = -1.0

        for sec, d in sector_data.items():
            avg_hrs = round(sum(d["resolution_durations_hrs"]) / len(d["resolution_durations_hrs"]), 1) if d["resolution_durations_hrs"] else city_avg_hrs * 1.25

            # Composite Equity Neglect Index: 0 to 100
            # Higher score = area demonstrates higher neglect / requires urgent supervisory attention
            # Factors:
            # 1. Unresolved aging / backlog
            # 2. Avg resolution delay compared to city avg
            # 3. Severe unattended issues
            # 4. Recurring hotspots
            # 5. Infrastructure vulnerability
            neglect_score = 0.0
            flag_reasons = []

            # Delay penalty
            if avg_hrs > city_avg_hrs * 1.3:
                delay_excess = min(30.0, (avg_hrs - city_avg_hrs) * 0.8)
                neglect_score += delay_excess
                flag_reasons.append(f"Average resolution time ({avg_hrs}h) is {round((avg_hrs/city_avg_hrs - 1)*100)}% slower than city average ({city_avg_hrs}h)")

            # Unresolved backlog penalty
            if d["unresolved_count"] >= 3:
                backlog_pts = min(25.0, d["unresolved_count"] * 6.0)
                neglect_score += backlog_pts
                flag_reasons.append(f"High open backlog ({d['unresolved_count']} active unresolved incidents)")

            # Severe safety penalty
            if d["severe_unresolved_count"] >= 1:
                severe_pts = min(25.0, d["severe_unresolved_count"] * 12.0)
                neglect_score += severe_pts
                flag_reasons.append(f"{d['severe_unresolved_count']} severe/critical hazard(s) awaiting intervention")

            # Recurring chronic issues
            if d["recurring_hotspots_count"] >= 1:
                rec_pts = min(15.0, d["recurring_hotspots_count"] * 8.0)
                neglect_score += rec_pts
                flag_reasons.append(f"{d['recurring_hotspots_count']} chronic recurring incident cluster(s) detected")

            # Low volume + High infra risk: flags digital divide / reporting gaps
            if d["total_reported"] <= 2 and d["infrastructure_vulnerabilities"] >= 1:
                neglect_score += 15.0
                flag_reasons.append("Under-reporting anomaly: Low complaint volume despite aging infrastructure assets; potential community digital access barrier")

            neglect_score = min(98.0, round(neglect_score, 1))
            is_flagged = neglect_score >= 55.0

            if is_flagged:
                flagged_count += 1

            if neglect_score > max_neglect_score:
                max_neglect_score = neglect_score
                highest_neglect_sector = sec

            metrics_list.append({
                "sector": sec,
                "total_reported": d["total_reported"],
                "unresolved_count": d["unresolved_count"],
                "recurring_hotspots_count": d["recurring_hotspots_count"],
                "avg_resolution_hours": avg_hrs,
                "severe_unresolved_count": d["severe_unresolved_count"],
                "infrastructure_vulnerabilities": d["infrastructure_vulnerabilities"],
                "equity_score": neglect_score,
                "flagged_for_review": is_flagged,
                "flag_reasons": flag_reasons if flag_reasons else ["Service metrics within expected operational parameters"],
                "last_inspection_days_ago": 18 if sec in ["Sector 26", "Sector 45"] else 7
            })

        metrics_list.sort(key=lambda x: x["equity_score"], reverse=True)

        return {
            "sectors": metrics_list,
            "city_avg_resolution_hours": city_avg_hrs,
            "highest_neglect_sector": highest_neglect_sector,
            "total_flagged_sectors": flagged_count,
            "summary_notes": f"{flagged_count} sectors flagged for supervisory equity review. Analysis adjusts for reporting volume and prioritizes resolution latency and structural vulnerability."
        }

equity_service = CivicEquityService()
