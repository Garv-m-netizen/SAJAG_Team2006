from app.services.graph_service import graph_service, haversine_distance_meters, text_token_similarity
from app.services.ripple_engine import ripple_engine

def test_haversine_and_token_similarity():
    # Aroma Chowk to Sector 17 Underpass (~800m)
    dist = haversine_distance_meters(30.7328, 76.7729, 30.7398, 76.7784)
    assert 700 < dist < 1100

    sim = text_token_similarity("garbage dump overflowing with trash", "overflowing garbage waste bin")
    assert sim > 0.25

def test_network_graph_generation(db):
    graph_data = graph_service.build_network_graph(db)
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert "stats" in graph_data
    assert len(graph_data["nodes"]) > 0
    assert graph_data["stats"]["total_nodes"] > 0

def test_ripple_engine_scenarios(db):
    dry_risks = ripple_engine.analyze_ripple_risks(db, scenario_key="dry_weather")
    monsoon_risks = ripple_engine.analyze_ripple_risks(db, scenario_key="heavy_monsoon")

    assert len(monsoon_risks) > 0
    # Monsoon risk score must be higher than dry weather risk score for underpass waterlogging
    monsoon_underpass = next((r for r in monsoon_risks if "underpass" in r["risk_type"].lower()), None)
    dry_underpass = next((r for r in dry_risks if "underpass" in r["risk_type"].lower()), None)

    if monsoon_underpass and dry_underpass:
        assert monsoon_underpass["score"] > dry_underpass["score"]
