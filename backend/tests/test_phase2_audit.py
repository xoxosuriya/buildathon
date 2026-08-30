import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from app import models, schemas, crud
from tests.conftest import TestingSessionLocal


def helper_setup_generic_entities(client, price_a="150.00", max_amount="500.00", quantity=3, inventory=10):
    """Helper to create generic User, Agent, Merchant, Product, MerchantState, and Intent with unique constraints."""
    uid_str = str(uuid.uuid4())[:8]
    u_res = client.post("/user", json={"name": f"Audit User {uid_str}", "email": f"audit_{uid_str}@test.org"})
    assert u_res.status_code == 201
    user_id = u_res.json()["id"]

    a_res = client.post("/agent", json={"name": f"Audit Agent {uid_str}", "agent_type": "AUDIT_AGENT"})
    assert a_res.status_code == 201
    agent_id = a_res.json()["id"]

    m_res = client.post("/merchant", json={"name": f"Audit Merchant {uid_str}", "category": "AUDIT_CAT"})
    assert m_res.status_code == 201
    merchant_id = m_res.json()["id"]

    p_res = client.post(
        "/product",
        json={
            "merchant_id": merchant_id,
            "name": f"Audit Product {uid_str}",
            "sku": f"SKU-{uid_str}",
            "category": "AUDIT_CAT",
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
            "inventory": inventory,
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
            "raw_prompt": "Audit intent prompt",
            "action": "PURCHASE",
            "category": "AUDIT_CAT",
            "max_amount": max_amount,
            "quantity": quantity,
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


# 1. amount * quantity (Authorization.max_amount == unit_price * quantity)
def test_audit_1_amount_times_quantity_contract(client):
    """Part 1: Verify Authorization.max_amount = proposed_price * quantity (Decimal arithmetic)."""
    entities = helper_setup_generic_entities(client, price_a="150.00", max_amount="500.00", quantity=3)

    prop_res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 3},
    )
    assert prop_res.status_code == 201
    proposal_id = prop_res.json()["proposal_id"]

    app_res = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": proposal_id, "intent_id": entities["intent_id"], "decision": "APPROVED"},
    )
    assert app_res.status_code == 200
    auth = app_res.json()

    # 150.00 * 3 = 450.00
    assert Decimal(str(auth["max_amount"])) == Decimal("450.00")


# 2. amount ceiling (unit_price * quantity > max_amount -> 400)
def test_audit_2_amount_ceiling_violation(client):
    """Part 3: Verify proposal generation rejects when total proposed amount exceeds Intent.max_amount."""
    entities = helper_setup_generic_entities(client, price_a="200.00", max_amount="300.00", quantity=2)

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 2},
    )
    assert res.status_code == 400
    assert "exceeds user's maximum authorized limit" in res.json()["detail"]


# 3. quantity ceiling (quantity > Intent.quantity -> 400)
def test_audit_3_quantity_ceiling_violation(client):
    """Part 3: Verify proposal generation rejects when quantity > Intent.quantity."""
    entities = helper_setup_generic_entities(client, price_a="100.00", quantity=1)

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 5},
    )
    assert res.status_code == 400
    assert "exceeds user's intended quantity limit" in res.json()["detail"]


# 4 & 5. zero and negative quantity
def test_audit_4_and_5_zero_or_negative_quantity(client):
    """Part 3: Verify proposal generation rejects zero or negative quantity."""
    entities = helper_setup_generic_entities(client, price_a="100.00", quantity=2)

    res_zero = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 0},
    )
    assert res_zero.status_code == 400

    res_neg = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": -1},
    )
    assert res_neg.status_code == 400


# 6. malicious MerchantState merchant mismatch
def test_audit_6_malicious_merchant_state_merchant_mismatch(client):
    """Part 4: Verify rejection when MerchantState.merchant_id does not match Product.merchant_id."""
    entities = helper_setup_generic_entities(client, price_a="100.00")

    m_b_res = client.post("/merchant", json={"name": "Merchant B", "category": "AUDIT_CAT"})
    merchant_b_id = m_b_res.json()["id"]

    client.post(
        "/merchant-state",
        json={
            "merchant_id": merchant_b_id,
            "product_id": entities["product_id"],
            "price": "100.00",
            "inventory": 10,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    assert res.status_code == 400
    assert "merchant_id does not match" in res.json()["detail"]


# 7. MerchantState/product mismatch
def test_audit_7_merchant_state_product_mismatch(client):
    """Part 6 Micro-Correction: Verify proposal generation fails with HTTP 404 when no MerchantState exists for requested Product."""
    entities1 = helper_setup_generic_entities(client, price_a="100.00")

    # Create Product B without creating any MerchantState for Product B
    p2_res = client.post(
        "/product",
        json={
            "merchant_id": entities1["merchant_id"],
            "name": "Product B without state",
            "sku": f"SKU-NOSTATE-{str(uuid.uuid4())[:6]}",
            "category": "AUDIT_CAT",
            "price": "100.00",
            "is_active": True,
        },
    )
    assert p2_res.status_code == 201
    product_b_id = p2_res.json()["id"]

    res = client.post(
        "/intent/workflow/proposal",
        json={
            "intent_id": entities1["intent_id"],
            "product_id": product_b_id,
            "quantity": 1,
        },
    )
    assert res.status_code == 404
    assert "MerchantState not found for product" in res.json()["detail"]


# 8. proposal/intent mismatch
def test_audit_8_proposal_intent_mismatch(client):
    """Part 5: Attempting to approve Proposal A with Intent B must fail with 404."""
    e1 = helper_setup_generic_entities(client, price_a="100.00")
    e2 = helper_setup_generic_entities(client, price_a="100.00")

    p1_res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": e1["intent_id"], "product_id": e1["product_id"], "quantity": 1},
    )
    prop1_id = p1_res.json()["proposal_id"]

    res = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop1_id, "intent_id": e2["intent_id"], "decision": "APPROVED"},
    )
    assert res.status_code == 404


# 9, 10, 11. single-use decision state machine
def test_audit_9_10_11_single_use_state_machine(client):
    """Part 7: Duplicate approval, approval after rejection, rejection after approval must return 400."""
    entities = helper_setup_generic_entities(client, price_a="100.00")

    prop_res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    prop_id = prop_res.json()["proposal_id"]

    # 1. First approval succeeds
    app1 = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop_id, "intent_id": entities["intent_id"], "decision": "APPROVED"},
    )
    assert app1.status_code == 200

    # 2. Duplicate approval -> 400
    app2 = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop_id, "intent_id": entities["intent_id"], "decision": "APPROVED"},
    )
    assert app2.status_code == 400

    # 3. Rejection after approval -> 400
    rej = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop_id, "intent_id": entities["intent_id"], "decision": "REJECTED"},
    )
    assert rej.status_code == 400


# 12. multiple proposals after finalized intent
def test_audit_12_multiple_proposals_after_finalized_intent(client):
    """Part 6: Once an Intent is finalized (APPROVED), any further proposal decision for that Intent must return 400."""
    entities = helper_setup_generic_entities(client, price_a="100.00", max_amount="500.00", quantity=3)

    p1_res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    prop1_id = p1_res.json()["proposal_id"]

    p2_res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 2},
    )
    prop2_id = p2_res.json()["proposal_id"]

    app1 = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop1_id, "intent_id": entities["intent_id"], "decision": "APPROVED"},
    )
    assert app1.status_code == 200

    app2 = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop2_id, "intent_id": entities["intent_id"], "decision": "APPROVED"},
    )
    assert app2.status_code == 400
    assert "already been finalized" in app2.json()["detail"]


# 13. DB IntegrityError handling for Authorization uniqueness constraint
def test_audit_13_db_integrity_error_handled_as_http_400(client):
    """Part 5 Micro-Correction: Verify DB IntegrityError on duplicate Authorization is caught and converted into HTTP 400."""
    entities = helper_setup_generic_entities(client, price_a="100.00")

    # Manually create an Authorization for this intent in DB
    db = TestingSessionLocal()
    existing_auth = models.Authorization(
        id=f"AUTH-{uuid.uuid4()}",
        intent_id=entities["intent_id"],
        user_id=entities["user_id"],
        agent_id=entities["agent_id"],
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        action="PURCHASE",
        quantity=1,
        max_amount=Decimal("100.00"),
        currency="INR",
        allowed_add_ons="none",
        status="ACTIVE",
    )
    db.add(existing_auth)
    db.commit()
    db.close()

    # Generate proposal
    prop_res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    prop_id = prop_res.json()["proposal_id"]

    # Attempt to approve -> DB unique constraint on intent_id will trigger IntegrityError in DB
    res = client.post(
        "/intent/workflow/approve",
        json={"proposal_id": prop_id, "intent_id": entities["intent_id"], "decision": "APPROVED"},
    )
    assert res.status_code == 400
    assert "already exists for this Intent" in res.json()["detail"]


# 14. Inventory quantity enforcement
def test_audit_14_inventory_quantity_enforcement(client):
    """Part 1 Micro-Correction: Reject proposal when quantity > MerchantState.inventory with HTTP 400."""
    # Inventory is set to 2, but Intent authorizes max quantity 5 and request asks for 3
    entities = helper_setup_generic_entities(client, price_a="100.00", max_amount="500.00", quantity=5, inventory=2)

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 3},
    )
    assert res.status_code == 400
    assert "exceeds available merchant inventory" in res.json()["detail"]


# 15. Inactive Product rejection
def test_audit_15_inactive_product_rejection(client):
    """Part 2 Micro-Correction: Reject proposal when Product.is_active is False with HTTP 400."""
    entities = helper_setup_generic_entities(client, price_a="100.00")

    # Deactivate product in DB
    db = TestingSessionLocal()
    db_p = db.query(models.Product).filter(models.Product.id == entities["product_id"]).first()
    db_p.is_active = False
    db.commit()
    db.close()

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    assert res.status_code == 400
    assert "Product is inactive" in res.json()["detail"]


# 16. Inactive Merchant rejection
def test_audit_16_inactive_merchant_rejection(client):
    """Part 3 Micro-Correction: Reject proposal when Merchant.status is not ACTIVE with HTTP 400."""
    entities = helper_setup_generic_entities(client, price_a="100.00")

    # Deactivate merchant in DB
    db = TestingSessionLocal()
    db_m = db.query(models.Merchant).filter(models.Merchant.id == entities["merchant_id"]).first()
    db_m.status = "SUSPENDED"
    db.commit()
    db.close()

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    assert res.status_code == 400
    assert "Merchant is inactive or unavailable" in res.json()["detail"]


# 17. Authoritative MerchantState selection by newest last_verified_at
def test_audit_17_authoritative_merchant_state_selection(client):
    """Part 4 Micro-Correction: Verify MerchantState with newest last_verified_at is selected for proposal price."""
    entities = helper_setup_generic_entities(client, price_a="100.00")

    # Add older state at 80.00
    db = TestingSessionLocal()
    older_state = models.MerchantState(
        id=f"MS-{uuid.uuid4()}",
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        price=Decimal("80.00"),
        inventory=10,
        offer_status="OLD",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    # Add newer state at 199.99
    newer_state = models.MerchantState(
        id=f"MS-{uuid.uuid4()}",
        merchant_id=entities["merchant_id"],
        product_id=entities["product_id"],
        price=Decimal("199.99"),
        inventory=10,
        offer_status="PROMO",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(older_state)
    db.add(newer_state)
    db.commit()
    db.close()

    res = client.post(
        "/intent/workflow/proposal",
        json={"intent_id": entities["intent_id"], "product_id": entities["product_id"], "quantity": 1},
    )
    assert res.status_code == 201
    snap = res.json()
    # Must pick newest state price (199.99)
    assert Decimal(str(snap["proposed_price"])) == Decimal("199.99")
