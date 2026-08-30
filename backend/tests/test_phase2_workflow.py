from decimal import Decimal


def helper_setup_generic_entities(client, price_a="150.00"):
    """Helper to create generic User, Agent, Merchant, Product, MerchantState, and Intent."""
    u_res = client.post("/user", json={"name": "Generic User", "email": "user@generic.test"})
    assert u_res.status_code == 201
    user_id = u_res.json()["id"]

    a_res = client.post("/agent", json={"name": "Generic Agent", "agent_type": "TEST_AGENT"})
    assert a_res.status_code == 201
    agent_id = a_res.json()["id"]

    m_res = client.post("/merchant", json={"name": "Generic Merchant", "category": "GENERAL"})
    assert m_res.status_code == 201
    merchant_id = m_res.json()["id"]

    p_res = client.post(
        "/product",
        json={
            "merchant_id": merchant_id,
            "name": "Generic Catalog Item",
            "sku": "SKU-GENERIC-101",
            "category": "GENERAL",
            "price": price_a,
            "is_active": True,
        },
    )
    assert p_res.status_code == 201
    product_id = p_res.json()["id"]

    ms_res = client.post(
        "/merchant-state",
        json={
            "merchant_id": merchant_id,
            "product_id": product_id,
            "price": price_a,
            "inventory": 10,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )
    assert ms_res.status_code == 201
    state_id = ms_res.json()["id"]

    i_res = client.post(
        "/intent",
        json={
            "user_id": user_id,
            "agent_id": agent_id,
            "raw_prompt": "Generic purchase intent",
            "action": "PURCHASE",
            "category": "GENERAL",
            "max_amount": "500.00",
            "quantity": 1,
        },
    )
    assert i_res.status_code == 201
    intent_id = i_res.json()["id"]

    return {
        "user_id": user_id,
        "agent_id": agent_id,
        "merchant_id": merchant_id,
        "product_id": product_id,
        "state_id": state_id,
        "intent_id": intent_id,
    }


def test_authoritative_price_derivation_and_snapshot(client):
    entities = helper_setup_generic_entities(client, price_a="150.00")

    # Generate proposal snapshot
    prop_res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": entities["intent_id"],
            "product_id": entities["product_id"],
            "quantity": 1,
            "add_ons": "none",
        },
    )
    assert prop_res.status_code == 201
    prop = prop_res.json()

    assert prop["proposal_id"].startswith("PROP-")
    assert Decimal(str(prop["proposed_price"])) == Decimal("150.00")
    assert prop["intent_id"] == entities["intent_id"]
    assert prop["product_id"] == entities["product_id"]
    assert prop["merchant_id"] == entities["merchant_id"]


def test_temporal_snapshot_price_freeze(client):
    """Mandatory Test #8: Prove Authorization is created from immutable proposal snapshot, not live MerchantState."""
    price_a = "150.00"
    price_b = "220.00"

    entities = helper_setup_generic_entities(client, price_a=price_a)

    # 1. Generate proposal at Price A (150.00)
    prop_res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": entities["intent_id"],
            "product_id": entities["product_id"],
            "quantity": 1,
            "add_ons": "none",
        },
    )
    assert prop_res.status_code == 201
    proposal_id = prop_res.json()["proposal_id"]

    # 2. Update MerchantState price to Price B (220.00)
    ms_b_res = client.post(
        "/merchant-state",
        json={
            "merchant_id": entities["merchant_id"],
            "product_id": entities["product_id"],
            "price": price_b,
            "inventory": 10,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )
    assert ms_b_res.status_code == 201

    # 3. User approves the existing proposal
    app_res = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": entities["intent_id"],
            "decision": "APPROVED",
            "expiry_hours": 24,
        },
    )
    assert app_res.status_code == 200
    auth = app_res.json()

    # 4. Verify Authorization max_amount remains Price A (150.00), NOT Price B (220.00)
    assert Decimal(str(auth["max_amount"])) == Decimal(price_a)
    assert Decimal(str(auth["max_amount"])) != Decimal(price_b)


def test_single_use_state_machine_integrity(client):
    """Mandatory Test #9: Duplicate approval, approval after rejection, rejection after approval must fail safely."""
    entities = helper_setup_generic_entities(client, price_a="150.00")

    prop_res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": entities["intent_id"],
            "product_id": entities["product_id"],
            "quantity": 1,
        },
    )
    proposal_id = prop_res.json()["proposal_id"]

    # 1. First approval succeeds
    app_res1 = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": entities["intent_id"],
            "decision": "APPROVED",
        },
    )
    assert app_res1.status_code == 200

    # 2. Duplicate approval attempt -> HTTP 400 Error
    app_res2 = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": entities["intent_id"],
            "decision": "APPROVED",
        },
    )
    assert app_res2.status_code == 400
    assert "already been finalized" in app_res2.json()["detail"]

    # 3. Rejection after approval attempt -> HTTP 400 Error
    rej_res = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": entities["intent_id"],
            "decision": "REJECTED",
        },
    )
    assert rej_res.status_code == 400


def test_rejection_flow_produces_no_authorization(client):
    entities = helper_setup_generic_entities(client, price_a="150.00")

    prop_res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": entities["intent_id"],
            "product_id": entities["product_id"],
            "quantity": 1,
        },
    )
    proposal_id = prop_res.json()["proposal_id"]

    # Rejection decision
    rej_res = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": entities["intent_id"],
            "decision": "REJECTED",
        },
    )
    assert rej_res.status_code == 200
    assert rej_res.json() is None

    # Check status endpoint
    status_res = client.get(f"/intent/workflow/{entities['intent_id']}/status")
    assert status_res.status_code == 200
    st_data = status_res.json()

    assert st_data["status"] == "REJECTED"
    assert st_data["authorization"] is None

    # Verify audit event recorded
    event_types = [e["event_type"] for e in st_data["audit_events"]]
    assert "PROPOSAL_REJECTED" in event_types
    assert "AUTHORIZATION_CREATED" not in event_types


def test_full_workflow_audit_sequence_and_status(client):
    entities = helper_setup_generic_entities(client, price_a="150.00")

    # Proposal
    prop_res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": entities["intent_id"],
            "product_id": entities["product_id"],
            "quantity": 1,
        },
    )
    proposal_id = prop_res.json()["proposal_id"]

    # Approval
    app_res = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": entities["intent_id"],
            "decision": "APPROVED",
            "expiry_hours": 12,
        },
    )
    assert app_res.status_code == 200

    # Retrieve status
    st_res = client.get(f"/intent/workflow/{entities['intent_id']}/status")
    assert st_res.status_code == 200
    st = st_res.json()

    assert st["status"] == "APPROVED"
    assert st["proposal_snapshot"]["proposal_id"] == proposal_id
    assert st["authorization"] is not None
    assert Decimal(str(st["authorization"]["max_amount"])) == Decimal("150.00")

    event_types = [e["event_type"] for e in st["audit_events"]]
    assert "PROPOSAL_GENERATED" in event_types
    assert "PROPOSAL_APPROVED" in event_types
    assert "AUTHORIZATION_CREATED" in event_types
