def test_login_and_roles(client):
    # Citizen login
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen1@chandigarh.org",
        "password": "Citizen@123"
    })
    assert res_cit.status_code == 200
    cit_token = res_cit.json()["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}

    # Citizen tries to access admin priority override (must receive 403 Forbidden)
    res_override = client.patch(
        "/api/v1/incidents/1/priority-override",
        headers=cit_headers,
        json={"priority_override": 99.0, "override_reason": "Citizen attempt"}
    )
    assert res_override.status_code == 403

    # Admin login
    res_adm = client.post("/api/v1/auth/login", json={
        "email": "admin@civicpulse.chandigarh.gov.in",
        "password": "Admin@123"
    })
    assert res_adm.status_code == 200
    adm_token = res_adm.json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # Admin priority override succeeds
    res_override_adm = client.patch(
        "/api/v1/incidents/1/priority-override",
        headers=adm_headers,
        json={"priority_override": 88.5, "override_reason": "Emergency safety inspection ordered by Commissioner"}
    )
    assert res_override_adm.status_code == 200
    assert res_override_adm.json()["priority_override"] == 88.5
    assert "Emergency safety inspection" in res_override_adm.json()["override_reason"]
