from app.services.intervention_sim import intervention_simulator

def test_intervention_simulator_resource_constraints(db):
    # Test with 1 crew vs 3 crews
    plan_1 = intervention_simulator.simulate(db, available_crews=1, budget_inr=50000.0, time_hours=12.0)
    plan_3 = intervention_simulator.simulate(db, available_crews=3, budget_inr=300000.0, time_hours=48.0)

    assert plan_1["available_crews"] == 1
    assert plan_3["available_crews"] == 3
    assert plan_3["incidents_addressed_count"] >= plan_1["incidents_addressed_count"]
    assert plan_1["total_estimated_cost"] <= 50000.0
    assert len(plan_3["recommended_actions"]) > 0
    assert len(plan_3["alternative_plans"]) == 2
