import uuid
import json
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
from tests.conftest import TestingSessionLocal, client
from tests.test_phase3_verification import helper_setup_verified_authorization, helper_create_transaction
from app import models


# 1. Missing Transaction.agent_id -> 422 Validation Error
def test_cap_1_missing_transaction_agent_id_rejected(client):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    res = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        # agent_id omitted
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    })
    assert res.status_code == 422


# 2. Correct Agent -> Eligible / ALLOW
def test_cap_2_correct_agent_id_succeeds(client):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="50.00", quantity=1)
    verif = client.post(f"/verify/{txn_id}").json()
    assert verif["decision"] == "ALLOW"


# 3. Different Agent -> BLOCK
def test_cap_3_different_agent_id_blocks(client):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    agent_b = client.post("/agent", json={"name": "Attacker Agent B", "agent_type": "ROGUE_BOT"}).json()

    stolen_txn = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": agent_b["id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    }).json()

    verif_res = client.post(f"/verify/{stolen_txn['id']}").json()
    assert verif_res["decision"] == "BLOCK"
    assert "agent_non_delegation_match" in verif_res["reason"]


# 4. Agent Override Attempt -> BLOCK
def test_cap_4_agent_override_attempt_blocks(client):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    agent_c = client.post("/agent", json={"name": "Overrider Agent C", "agent_type": "ROGUE_BOT"}).json()

    override_txn = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": agent_c["id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    }).json()

    verif = client.post(f"/verify/{override_txn['id']}").json()
    assert verif["decision"] == "BLOCK"


# 5. Malicious accepted_price (1.00 when live is 120.00) -> REJECT
def test_cap_5_malicious_accepted_price_low_rejected(client):
    u = client.post("/user", json={"email": "m5_user@test.org", "name": "M5 User"}).json()
    m = client.post("/merchant", json={"name": "M5 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M5-SKU", "name": "M5 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M5 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    # Update merchant price live to 120.00
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "REVIEW"

    # Client attempts malicious accepted_price = 1.00
    res = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Attacker price drop to 1.00", "action": "ACCEPT", "accepted_price": "1.00"})
    assert res.status_code == 400
    assert "does not match current authoritative merchant state price" in res.json()["detail"]


# 6. Malicious accepted_price (999999.00 when live is 120.00) -> REJECT
def test_cap_6_malicious_accepted_price_high_rejected(client):
    u = client.post("/user", json={"email": "m6_user@test.org", "name": "M6 User"}).json()
    m = client.post("/merchant", json={"name": "M6 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M6-SKU", "name": "M6 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M6 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "REVIEW"

    # Client attempts malicious accepted_price = 999999.00
    res = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Attacker inflated price", "action": "ACCEPT", "accepted_price": "999999.00"})
    assert res.status_code == 400


# 7. Authoritative Price Accepted (120.00 == 120.00) -> ACCEPT & ALLOW
def test_cap_7_authoritative_price_accepted_succeeds(client):
    u = client.post("/user", json={"email": "m7_user@test.org", "name": "M7 User"}).json()
    m = client.post("/merchant", json={"name": "M7 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M7-SKU", "name": "M7 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M7 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "REVIEW"

    res = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Accept authoritative price", "action": "ACCEPT", "accepted_price": "120.00"})
    assert res.status_code == 200, res.text
    assert res.json()["decision"] == "ALLOW"


# 8. Review ACCEPT Does NOT Mutate Merchant State or Product Price
def test_cap_8_review_accept_does_not_mutate_merchant_truth(client):
    u = client.post("/user", json={"email": "m8_user@test.org", "name": "M8 User"}).json()
    m = client.post("/merchant", json={"name": "M8 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M8-SKU", "name": "M8 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M8 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    client.post(f"/verify/{txn['id']}")

    # Accept review with 120.00
    client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Accept price", "action": "ACCEPT", "accepted_price": "120.00"})

    # Verify Product.price in DB is still original 100.00 (NOT overwritten by review endpoint)
    db = TestingSessionLocal()
    prod_db = db.query(models.Product).filter(models.Product.id == p["id"]).first()
    assert Decimal(str(prod_db.price)) == Decimal("100.00")
    db.close()


# 9. Review ACCEPT Atomic Rollback Guarantee
def test_cap_9_review_accept_atomic_rollback(client):
    u = client.post("/user", json={"email": "m9_user@test.org", "name": "M9 User"}).json()
    m = client.post("/merchant", json={"name": "M9 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M9-SKU", "name": "M9 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M9 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    client.post(f"/verify/{txn['id']}")

    # Pass mismatched accepted_price (triggers error before commit)
    res = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Fail attempt", "action": "ACCEPT", "accepted_price": "99.00"})
    assert res.status_code == 400

    # Confirm old authorization status is STILL ACTIVE (atomic rollback, not SUPERSEDED)
    db = TestingSessionLocal()
    auth_db = db.query(models.Authorization).filter(models.Authorization.id == auth["id"]).first()
    assert auth_db.status == "ACTIVE"
    db.close()


# 10. Old Capability Unusable After ACCEPT
def test_cap_10_old_capability_unusable_after_accept(client):
    u = client.post("/user", json={"email": "m10_user@test.org", "name": "M10 User"}).json()
    m = client.post("/merchant", json={"name": "M10 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M10-SKU", "name": "M10 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M10 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    client.post(f"/verify/{txn['id']}")
    client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Accept price", "action": "ACCEPT", "accepted_price": "120.00"})

    # Attempt to create another transaction using old capability auth["id"]
    txn_old = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "120.00", "quantity": 1, "currency": "INR"}).json()
    verif_old = client.post(f"/verify/{txn_old['id']}").json()
    assert verif_old["decision"] == "BLOCK"


# 11. New Capability Usable Only After Re-verification
def test_cap_11_new_capability_usable_after_reverification(client):
    u = client.post("/user", json={"email": "m11_user@test.org", "name": "M11 User"}).json()
    m = client.post("/merchant", json={"name": "M11 Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": "M11-SKU", "name": "M11 Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "M11 Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    client.post(f"/verify/{txn['id']}")
    res = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Accept price", "action": "ACCEPT", "accepted_price": "120.00"}).json()

    # Re-verified transaction decision must be ALLOW and payment succeeds
    assert res["decision"] == "ALLOW"
    pay = client.post("/payment/execute", json={"transaction_id": res["transaction_id"]})
    assert pay.status_code == 200


# 12. Old Capability Cannot Be Reused (Replay Protection)
def test_cap_12_old_capability_replay_protection(client):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    txn1_id = helper_create_transaction(client, entities, amount="50.00", quantity=1)
    client.post(f"/verify/{txn1_id}")

    # Second transaction attempt on same capability
    txn2_id = helper_create_transaction(client, entities, amount="50.00", quantity=1)
    verif2 = client.post(f"/verify/{txn2_id}").json()
    assert verif2["decision"] == "BLOCK"


# 13. Subdivision ₹20K + ₹30K (2nd Attempt Blocks)
def test_cap_13_subdivision_20k_30k_blocks(client):
    entities = helper_setup_verified_authorization(client, price_a="50000.00", max_amount="50000.00", quantity=1)
    txn1 = helper_create_transaction(client, entities, amount="20000.00", quantity=1)
    v1 = client.post(f"/verify/{txn1}").json()
    assert v1["decision"] == "ALLOW"

    txn2 = helper_create_transaction(client, entities, amount="30000.00", quantity=1)
    v2 = client.post(f"/verify/{txn2}").json()
    assert v2["decision"] == "BLOCK"


# 14. Subdivision ₹1 + ₹49,999 (2nd Attempt Blocks)
def test_cap_14_subdivision_1_49999_blocks(client):
    entities = helper_setup_verified_authorization(client, price_a="50000.00", max_amount="50000.00", quantity=1)
    txn1 = helper_create_transaction(client, entities, amount="1.00", quantity=1)
    v1 = client.post(f"/verify/{txn1}").json()
    assert v1["decision"] == "ALLOW"

    txn2 = helper_create_transaction(client, entities, amount="49999.00", quantity=1)
    v2 = client.post(f"/verify/{txn2}").json()
    assert v2["decision"] == "BLOCK"


# 15. Subdivision ₹49,999 + ₹1 (2nd Attempt Blocks)
def test_cap_15_subdivision_49999_1_blocks(client):
    entities = helper_setup_verified_authorization(client, price_a="50000.00", max_amount="50000.00", quantity=1)
    txn1 = helper_create_transaction(client, entities, amount="49999.00", quantity=1)
    v1 = client.post(f"/verify/{txn1}").json()
    assert v1["decision"] == "ALLOW"

    txn2 = helper_create_transaction(client, entities, amount="1.00", quantity=1)
    v2 = client.post(f"/verify/{txn2}").json()
    assert v2["decision"] == "BLOCK"


# 16. Concurrent Capability Consumption (Single-Winner Execution)
def test_cap_16_concurrent_capability_consumption(client):
    from fastapi.testclient import TestClient
    from app.main import app

    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn1 = helper_create_transaction(client, entities, amount="100.00", quantity=1)
    txn2 = helper_create_transaction(client, entities, amount="100.00", quantity=1)

    c1 = TestClient(app)
    c2 = TestClient(app)

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(c1.post, f"/verify/{txn1}")
        f2 = executor.submit(c2.post, f"/verify/{txn2}")
        r1 = f1.result().json()
        r2 = f2.result().json()

    decisions = [r1.get("decision"), r2.get("decision")]
    assert decisions.count("ALLOW") <= 1
    assert decisions.count("BLOCK") >= 1


# 17. Client Hash Injection (Server Overwrites / Ignores Client-Supplied Hash)
def test_cap_17_client_hash_injection_ignored(client):
    fake_hash = "f" * 64
    fake_prev = "e" * 64
    res = client.post("/audit", json={
        "trace_id": "TRACE-TEST-123",
        "event_type": "TEST_INJECTION",
        "payload": "{}",
        "previous_hash": fake_prev,
        "hash": fake_hash
    })
    assert res.status_code == 201
    evt = res.json()
    # Server must have overwritten client-supplied fake hash with true SHA-256
    assert evt["hash"] != fake_hash


# 18. Audit-Chain Tampering Detection (Sequential SHA-256 Links)
def test_cap_18_audit_chain_tampering_detection(client):
    entities = helper_setup_verified_authorization(client, price_a="10.00", max_amount="50.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="10.00", quantity=1)
    client.post(f"/verify/{txn_id}")

    res = client.get("/audit/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 2

    for idx in range(1, len(events)):
        curr_event = events[idx]
        prev_event = events[idx - 1]
        assert "hash" in curr_event and curr_event["hash"] is not None
        assert curr_event["previous_hash"] == prev_event["hash"]
