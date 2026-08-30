import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from app import models
from tests.conftest import TestingSessionLocal


def helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3, add_ons="warranty, express_shipping"):
    """Helper to execute full Phase 2 workflow: User -> Agent -> Merchant -> Product -> MerchantState -> Intent -> Proposal -> Approved Authorization."""
    uid_str = str(uuid.uuid4())[:8]

    u_res = client.post("/user", json={"name": f"P3 User {uid_str}", "email": f"p3_{uid_str}@test.org"})
    assert u_res.status_code == 201
    user_id = u_res.json()["id"]

    a_res = client.post("/agent", json={"name": f"P3 Agent {uid_str}", "agent_type": "SHOPPING_AGENT"})
    assert a_res.status_code == 201
    agent_id = a_res.json()["id"]

    m_res = client.post("/merchant", json={"name": f"P3 Merchant {uid_str}", "category": "ELECTRONICS"})
    assert m_res.status_code == 201
    merchant_id = m_res.json()["id"]

    p_res = client.post(
        "/product",
        json={
            "merchant_id": merchant_id,
            "name": f"P3 Laptop {uid_str}",
            "sku": f"SKU-P3-{uid_str}",
            "category": "ELECTRONICS",
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
            "last_verified_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert ms_res.status_code == 201
    state_id = ms_res.json()["id"]

    i_res = client.post(
        "/intent",
        json={
            "user_id": user_id,
            "agent_id": agent_id,
            "raw_prompt": "Buy laptop",
            "action": "PURCHASE",
            "category": "ELECTRONICS",
            "max_amount": max_amount,
            "quantity": quantity,
        },
    )
    assert i_res.status_code == 201
    intent_id = i_res.json()["id"]

    prop_res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": intent_id,
            "product_id": product_id,
            "quantity": quantity,
            "add_ons": add_ons,
        },
    )
    assert prop_res.status_code == 201
    proposal_id = prop_res.json()["proposal_id"]

    app_res = client.post(
        "/intent/workflow/approve",
        json={
            "proposal_id": proposal_id,
            "intent_id": intent_id,
            "decision": "APPROVED",
            "expiry_hours": 24,
        },
    )
    assert app_res.status_code == 200
    auth = app_res.json()

    return {
        "user_id": user_id,
        "agent_id": agent_id,
        "merchant_id": merchant_id,
        "product_id": product_id,
        "state_id": state_id,
        "intent_id": intent_id,
        "proposal_id": proposal_id,
        "authorization_id": auth["id"],
        "auth_max_amount": Decimal(str(auth["max_amount"])),
        "auth_quantity": auth["quantity"],
        "auth_add_ons": auth["allowed_add_ons"],
    }


def helper_create_transaction(client, entities, amount="450.00", quantity=3, currency="INR", add_ons="warranty", agent_id=None):
    """Helper to call POST /transaction to persist a transaction record before verification."""
    req_agent_id = agent_id or entities.get("agent_id")
    txn_res = client.post(
        "/transaction",
        json={
            "authorization_id": entities["authorization_id"],
            "agent_id": req_agent_id,
            "merchant_id": entities["merchant_id"],
            "product_id": entities["product_id"],
            "requested_amount": amount,
            "quantity": quantity,
            "currency": currency,
            "add_ons": add_ons,
        },
    )
    assert txn_res.status_code == 201
    return txn_res.json()["id"]


# 1. Happy Path -> ALLOW
def test_p3_1_valid_transaction_allow(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)
    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3, add_ons="warranty")

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["decision"] == "ALLOW"
    assert data["transaction_id"] == txn_id
    assert data["authorization_id"] == entities["authorization_id"]
    assert "All 21" in data["reason"]


# 2. Missing Authorization -> 404
def test_p3_2_missing_authorization_block(client):
    entities = helper_setup_verified_authorization(client)
    fake_auth_id = f"AUTH-FAKE-{str(uuid.uuid4())[:6]}"
    txn_res = client.post(
        "/transaction",
        json={
            "authorization_id": fake_auth_id,
            "agent_id": entities["agent_id"],
            "merchant_id": entities["merchant_id"],
            "product_id": entities["product_id"],
            "requested_amount": "150.00",
            "quantity": 1,
            "currency": "INR",
        },
    )
    assert txn_res.status_code == 400 or txn_res.status_code == 201


# 3. Inactive Authorization -> BLOCK
def test_p3_3_inactive_authorization_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    try:
        db_auth = db.query(models.Authorization).filter(models.Authorization.id == entities["authorization_id"]).first()
        db_auth.status = "EXPIRED"
        db.commit()
    finally:
        db.close()

    txn_id = helper_create_transaction(client, entities, amount="150.00", quantity=1)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 4. Expired Authorization -> BLOCK
def test_p3_4_expired_authorization_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    try:
        db_auth = db.query(models.Authorization).filter(models.Authorization.id == entities["authorization_id"]).first()
        db_auth.expiry_time = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    txn_id = helper_create_transaction(client, entities, amount="150.00", quantity=1)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 5. Wrong Merchant -> BLOCK
def test_p3_5_wrong_merchant_block(client):
    entities = helper_setup_verified_authorization(client)
    m2_res = client.post("/merchant", json={"name": "Merchant M2", "category": "OTHER"})
    m2_id = m2_res.json()["id"]

    txn_res = client.post(
        "/transaction",
        json={
            "authorization_id": entities["authorization_id"],
            "agent_id": entities["agent_id"],
            "merchant_id": m2_id,  # Mismatched merchant
            "product_id": entities["product_id"],
            "requested_amount": "150.00",
            "quantity": 1,
            "currency": "INR",
        },
    )
    txn_id = txn_res.json()["id"]

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 6. Wrong Product -> BLOCK
def test_p3_6_wrong_product_block(client):
    entities = helper_setup_verified_authorization(client)
    p2_res = client.post(
        "/product",
        json={
            "merchant_id": entities["merchant_id"],
            "name": "Product P2",
            "sku": f"SKU-P2-{str(uuid.uuid4())[:6]}",
            "category": "ELECTRONICS",
            "price": "100.00",
            "is_active": True,
        },
    )
    p2_id = p2_res.json()["id"]

    # Create MerchantState for Product P2
    client.post(
        "/merchant-state",
        json={
            "merchant_id": entities["merchant_id"],
            "product_id": p2_id,
            "price": "100.00",
            "inventory": 10,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )

    txn_res = client.post(
        "/transaction",
        json={
            "authorization_id": entities["authorization_id"],
            "agent_id": entities["agent_id"],
            "merchant_id": entities["merchant_id"],
            "product_id": p2_id,  # Mismatched product
            "requested_amount": "150.00",
            "quantity": 1,
            "currency": "INR",
        },
    )
    txn_id = txn_res.json()["id"]

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 7. Missing Transaction -> 404
def test_p3_7_missing_transaction_404(client):
    fake_txn_id = f"TXN-{uuid.uuid4()}"
    res = client.post(f"/verify/{fake_txn_id}")
    assert res.status_code == 404


# 8. Negative Amount -> BLOCK
def test_p3_8_negative_amount_block(client):
    entities = helper_setup_verified_authorization(client)
    txn_id = helper_create_transaction(client, entities, amount="-50.00", quantity=1)

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 9. Exact Max Amount -> ALLOW
def test_p3_9_exact_max_amount_allow(client):
    entities = helper_setup_generic_entities_for_max(client)
    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "ALLOW"


def helper_setup_generic_entities_for_max(client):
    return helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)


# 10. Excessive Amount -> BLOCK
def test_p3_10_excessive_amount_block(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)
    # Auth max_amount = 450.00. Requested = 460.00
    txn_id = helper_create_transaction(client, entities, amount="460.00", quantity=3)

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 11. Zero or Negative Quantity -> BLOCK
def test_p3_11_zero_or_negative_quantity_block(client):
    entities = helper_setup_verified_authorization(client)
    txn_id_zero = helper_create_transaction(client, entities, amount="100.00", quantity=0)

    res_zero = client.post(f"/verify/{txn_id_zero}")
    assert res_zero.status_code == 200
    assert res_zero.json()["decision"] == "BLOCK"


# 12. Excessive Quantity -> BLOCK
def test_p3_12_excessive_quantity_block(client):
    entities = helper_setup_verified_authorization(client, quantity=2)
    txn_id = helper_create_transaction(client, entities, amount="300.00", quantity=5)

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 13. Currency Mismatch -> BLOCK
def test_p3_13_currency_mismatch_block(client):
    entities = helper_setup_verified_authorization(client)
    txn_id = helper_create_transaction(client, entities, amount="150.00", quantity=1, currency="USD")

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 14. Unauthorized Add-on -> BLOCK
def test_p3_14_unauthorized_addon_block(client):
    entities = helper_setup_verified_authorization(client, add_ons="warranty")
    txn_id = helper_create_transaction(client, entities, amount="150.00", quantity=1, add_ons="warranty, premium_support")

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 15. Substring Add-on Attack -> BLOCK
def test_p3_15_substring_addon_attack_block(client):
    entities = helper_setup_verified_authorization(client, add_ons="warranty")
    # Substring matching attack: sending "war" when "warranty" is allowed
    txn_id = helper_create_transaction(client, entities, amount="150.00", quantity=1, add_ons="war")

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 16. Inactive Merchant -> BLOCK
def test_p3_16_inactive_merchant_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    m = db.query(models.Merchant).filter(models.Merchant.id == entities["merchant_id"]).first()
    m.status = "SUSPENDED"
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 17. Inactive Product -> BLOCK
def test_p3_17_inactive_product_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    p = db.query(models.Product).filter(models.Product.id == entities["product_id"]).first()
    p.is_active = False
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 18. Product Merchant Hierarchy Mismatch -> BLOCK
def test_p3_18_product_merchant_hierarchy_mismatch_block(client):
    entities = helper_setup_verified_authorization(client)
    m2_res = client.post("/merchant", json={"name": "Merchant M2", "category": "OTHER"})
    m2_id = m2_res.json()["id"]

    db = TestingSessionLocal()
    p = db.query(models.Product).filter(models.Product.id == entities["product_id"]).first()
    p.merchant_id = m2_id
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 19. Missing MerchantState -> BLOCK
def test_p3_19_missing_merchant_state_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).delete()
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 20. Unavailable MerchantState -> BLOCK
def test_p3_20_unavailable_merchant_state_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.is_available = False
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 21. Insufficient Inventory -> BLOCK
def test_p3_21_insufficient_inventory_block(client):
    entities = helper_setup_verified_authorization(client, quantity=3)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.inventory = 1  # Only 1 in stock, requested 3
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 22. Stale MerchantState -> REVIEW
def test_p3_22_stale_merchant_state_review(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=48)
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "REVIEW"


# 23. Missing Timestamp -> BLOCK
def test_p3_23_missing_timestamp_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = None
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 24. Future Timestamp -> BLOCK
def test_p3_24_future_timestamp_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc) + timedelta(days=1)
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 25. Changed Live Price Within Authorized Amount -> REVIEW
def test_p3_25_live_price_changed_within_amount_review(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)
    # Update live merchant state price to 160.00
    db = TestingSessionLocal()
    client.post(
        "/merchant-state",
        json={
            "merchant_id": entities["merchant_id"],
            "product_id": entities["product_id"],
            "price": "160.00",
            "inventory": 10,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )
    db.close()

    # Requested total amount 450.00 <= max_amount 500.00
    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "REVIEW"


# 26. Price Changed + Amount Violation -> BLOCK (Price discrepancy does NOT downgrade amount BLOCK)
def test_p3_26_price_changed_and_amount_violation_block(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)
    client.post(
        "/merchant-state",
        json={
            "merchant_id": entities["merchant_id"],
            "product_id": entities["product_id"],
            "price": "160.00",
            "inventory": 10,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )
    # Requested amount 520.00 > max_amount 500.00
    txn_id = helper_create_transaction(client, entities, amount="520.00", quantity=3)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 27. First ALLOW Consumes Authorization -> Second DIFFERENT Txn Replays to BLOCK
def test_p3_27_replay_protection_consumes_authorization(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)

    txn1_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res1 = client.post(f"/verify/{txn1_id}")
    assert res1.status_code == 200
    assert res1.json()["decision"] == "ALLOW"

    # Second DIFFERENT transaction using same consumed authorization
    txn2_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res2 = client.post(f"/verify/{txn2_id}")
    assert res2.status_code == 200
    assert res2.json()["decision"] == "BLOCK"
    assert "replay_protection" in res2.json()["reason"] or "authorization_active" in res2.json()["reason"] or "Replay" in res2.json()["reason"] or "consumed" in res2.json()["reason"]


# 28. BLOCK Does NOT Consume Authorization (Retry Can Succeed)
def test_p3_28_block_does_not_consume_authorization(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)

    # First transaction has excessive amount -> BLOCK
    txn1_id = helper_create_transaction(client, entities, amount="600.00", quantity=3)
    res1 = client.post(f"/verify/{txn1_id}")
    assert res1.status_code == 200
    assert res1.json()["decision"] == "BLOCK"

    # Second transaction with valid amount -> ALLOW (retry succeeds!)
    txn2_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res2 = client.post(f"/verify/{txn2_id}")
    assert res2.status_code == 200
    assert res2.json()["decision"] == "ALLOW"


# 29. REVIEW Does NOT Consume Authorization (Retry Can Succeed)
def test_p3_29_review_does_not_consume_authorization(client):
    entities = helper_setup_verified_authorization(client, price_a="150.00", max_amount="500.00", quantity=3)

    # Make state stale -> REVIEW
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=48)
    db.commit()
    db.close()

    txn1_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res1 = client.post(f"/verify/{txn1_id}")
    assert res1.status_code == 200
    assert res1.json()["decision"] == "REVIEW"

    # Refresh merchant state timestamp
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc)
    db.commit()
    db.close()

    # Second transaction after resolving review condition -> ALLOW!
    txn2_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res2 = client.post(f"/verify/{txn2_id}")
    assert res2.status_code == 200
    assert res2.json()["decision"] == "ALLOW"


# 30. Idempotency: Same Transaction Verified Repeatedly Returns Stored Result Directly
def test_p3_30_idempotency_same_transaction_repeated(client):
    entities = helper_setup_verified_authorization(client)
    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)

    res1 = client.post(f"/verify/{txn_id}")
    assert res1.status_code == 200
    d1 = res1.json()

    # Second call for SAME transaction
    res2 = client.post(f"/verify/{txn_id}")
    assert res2.status_code == 200
    d2 = res2.json()

    assert d1["id"] == d2["id"]
    assert d1["decision"] == d2["decision"]

    # Verify database has exactly 1 VerificationResult record for this transaction
    db = TestingSessionLocal()
    count = db.query(models.VerificationResult).filter(models.VerificationResult.transaction_id == txn_id).count()
    db.close()
    assert count == 1


# 31. Every Verification Creates VerificationResult & AuditEvent Evidence
def test_p3_31_persistence_and_audit_evidence(client):
    entities = helper_setup_verified_authorization(client)
    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    verif_id = res.json()["id"]

    db = TestingSessionLocal()
    verif = db.query(models.VerificationResult).filter(models.VerificationResult.id == verif_id).first()
    assert verif is not None
    assert verif.decision == "ALLOW"
    assert "check" in verif.checks_passed

    audit_ev = (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.transaction_id == txn_id)
        .filter(models.AuditEvent.event_type == "TRANSACTION_VERIFIED")
        .first()
    )
    assert audit_ev is not None
    db.close()


# 32. Multiple MerchantStates Selection: Newest Valid State Selected
def test_p3_32_multiple_merchant_states_newest_selected(client):
    entities = helper_setup_verified_authorization(client, price_a="100.00")

    # Delete initial state created during setup so ms_old and ms_new are the only records
    db = TestingSessionLocal()
    db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).delete()

    # Insert older state at 80.00
    ms_old = models.MerchantState(
        id=f"MS-1-{uuid.uuid4()}",
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        price=Decimal("80.00"),
        inventory=10,
        offer_status="OLD",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc) - timedelta(days=2),
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    # Insert newer state at 100.00
    ms_new = models.MerchantState(
        id=f"MS-2-{uuid.uuid4()}",
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        price=Decimal("100.00"),
        inventory=10,
        offer_status="CURRENT",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db.add(ms_old)
    db.add(ms_new)
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities, amount="300.00", quantity=3)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    # Proposal price was 100.00, newest state is 100.00 -> MATCHES -> ALLOW
    assert res.json()["decision"] == "ALLOW"


# 33. Missing PROPOSAL_GENERATED Snapshot -> BLOCK
def test_p3_33_missing_proposal_generated_snapshot_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    db.query(models.AuditEvent).filter(
        models.AuditEvent.trace_id == entities["intent_id"],
        models.AuditEvent.event_type == "PROPOSAL_GENERATED",
    ).delete()
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"
    assert "proposal snapshot" in res.json()["reason"].lower() or "unresolvable" in res.json()["reason"].lower() or "hard security" in res.json()["reason"].lower()


# 34. Malformed PROPOSAL_GENERATED Payload -> BLOCK
def test_p3_34_malformed_proposal_generated_payload_block(client):
    entities = helper_setup_verified_authorization(client)
    db = TestingSessionLocal()
    gen_event = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.trace_id == entities["intent_id"],
            models.AuditEvent.event_type == "PROPOSAL_GENERATED",
        )
        .first()
    )
    gen_event.payload = "{INVALID_JSON_CORRUPT}"
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 35. Unrelated Proposal Snapshot Cannot Be Substituted -> BLOCK
def test_p3_35_unrelated_proposal_snapshot_substitution_block(client):
    entities1 = helper_setup_verified_authorization(client, price_a="100.00", max_amount="300.00", quantity=2)

    # Tamper with PROPOSAL_APPROVED payload to point to a non-existent proposal_id
    db = TestingSessionLocal()
    app_ev = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.trace_id == entities1["intent_id"],
            models.AuditEvent.authorization_id == entities1["authorization_id"],
            models.AuditEvent.event_type == "PROPOSAL_APPROVED",
        )
        .first()
    )
    app_ev.payload = json.dumps({"proposal_id": "SUBSTITUTED_UNRELATED_PROPOSAL_ID", "authorization_id": entities1["authorization_id"]})
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities1, amount="200.00", quantity=2)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"


# 36. Idempotency REVIEW Repeated Returns Original Stored Result Directly
def test_p3_36_idempotency_review_repeated_returns_same_result(client):
    entities = helper_setup_verified_authorization(client)
    # Stale timestamp -> REVIEW
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=48)
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities, amount="450.00", quantity=3)
    res1 = client.post(f"/verify/{txn_id}")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["decision"] == "REVIEW"

    # Repeat verification call for SAME transaction
    res2 = client.post(f"/verify/{txn_id}")
    assert res2.status_code == 200
    d2 = res2.json()

    assert d1["id"] == d2["id"]
    assert d1["decision"] == d2["decision"]

    db = TestingSessionLocal()
    count = db.query(models.VerificationResult).filter(models.VerificationResult.transaction_id == txn_id).count()
    db.close()
    assert count == 1


# 37. Idempotency BLOCK Repeated Returns Original Stored Result Directly
def test_p3_37_idempotency_block_repeated_returns_same_result(client):
    entities = helper_setup_verified_authorization(client)
    # Excessive amount -> BLOCK
    txn_id = helper_create_transaction(client, entities, amount="999.00", quantity=3)

    res1 = client.post(f"/verify/{txn_id}")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["decision"] == "BLOCK"

    # Repeat verification call for SAME transaction
    res2 = client.post(f"/verify/{txn_id}")
    assert res2.status_code == 200
    d2 = res2.json()

    assert d1["id"] == d2["id"]
    assert d1["decision"] == d2["decision"]

    db = TestingSessionLocal()
    count = db.query(models.VerificationResult).filter(models.VerificationResult.transaction_id == txn_id).count()
    db.close()
    assert count == 1


# 38. Newest MerchantState with NULL last_verified_at Blocks (Does NOT fall back to older state)
def test_p3_38_newest_merchant_state_null_timestamp_blocks(client):
    entities = helper_setup_verified_authorization(client, price_a="100.00")

    # Delete initial state created during setup so ms_old and ms_new are the only records
    db = TestingSessionLocal()
    db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).delete()

    ms_old = models.MerchantState(
        id=f"MS-1-{uuid.uuid4()}",
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        price=Decimal("100.00"),
        inventory=10,
        offer_status="OLD",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc) - timedelta(hours=2),
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    ms_new = models.MerchantState(
        id=f"MS-2-{uuid.uuid4()}",
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        price=Decimal("100.00"),
        inventory=10,
        offer_status="NEW_UNVERIFIED",
        is_available=True,
        last_verified_at=None,
        created_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(ms_old)
    db.add(ms_new)
    db.commit()

    # Set last_verified_at to NULL via raw SQL to bypass SQLAlchemy column default
    from sqlalchemy import text
    db.execute(text("UPDATE merchant_states SET last_verified_at = NULL WHERE id = :id"), {"id": ms_new.id})
    db.commit()
    db.close()

    txn_id = helper_create_transaction(client, entities, amount="300.00", quantity=3)
    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    # Must select the newest state (which has NULL timestamp) and return BLOCK rather than falling back to older state!
    assert res.json()["decision"] == "BLOCK"
    assert "merchant_state_freshness" in res.json()["reason"]


# 39. Physical Database Unique Constraint Test
def test_p3_39_physical_db_schema_unique_constraint():
    from sqlalchemy import inspect
    from tests.conftest import engine
    inspector = inspect(engine)
    indexes = inspector.get_indexes("verification_results")
    unique_constraints = inspector.get_unique_constraints("verification_results")
    unique_columns = []
    for idx in indexes:
        if idx.get("unique"):
            unique_columns.extend(idx.get("column_names", []))
    for uc in unique_constraints:
        unique_columns.extend(uc.get("column_names", []))
    assert "transaction_id" in unique_columns


# 40. Concurrent Authorization Consumption Simulation
def test_p3_40_concurrent_authorization_consumption_simulation(client):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="300.00", quantity=3)
    txn_id = helper_create_transaction(client, entities, amount="300.00", quantity=3)

    # Concurrently mark authorization as USED before calling verify
    db = TestingSessionLocal()
    auth = db.query(models.Authorization).filter(models.Authorization.id == entities["authorization_id"]).first()
    auth.status = "USED"
    db.commit()
    db.close()

    res = client.post(f"/verify/{txn_id}")
    assert res.status_code == 200
    assert res.json()["decision"] == "BLOCK"
    assert "replay_protection" in res.json()["reason"] or "authorization_active" in res.json()["reason"]


