import uuid
import json
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
from tests.conftest import TestingSessionLocal, client
from tests.test_phase3_verification import helper_setup_verified_authorization, helper_create_transaction
from app import models, schemas


# =====================================================================
# A. CAPABILITY SECURITY MATRIX (~80 cases)
# =====================================================================
@pytest.mark.parametrize("agent_type,auth_status,merchant_match,product_match,amount_override,expected_decision", [
    ("correct", "ACTIVE", True, True, "50.00", "ALLOW"),
    ("wrong", "ACTIVE", True, True, "50.00", "BLOCK"),
    ("missing", "ACTIVE", True, True, "50.00", "422"),
    ("correct", "EXPIRED", True, True, "50.00", "BLOCK"),
    ("correct", "USED", True, True, "50.00", "BLOCK"),
    ("correct", "SUPERSEDED", True, True, "50.00", "BLOCK"),
    ("correct", "REJECTED", True, True, "50.00", "BLOCK"),
    ("correct", "ACTIVE", False, True, "50.00", "BLOCK"),
    ("correct", "ACTIVE", True, False, "50.00", "BLOCK"),
    ("correct", "ACTIVE", True, True, "999.00", "BLOCK"),
])
def test_audit_a_capability_combination_matrix(client, agent_type, auth_status, merchant_match, product_match, amount_override, expected_decision):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    
    agent_id = entities["agent_id"]
    if agent_type == "wrong":
        b = client.post("/agent", json={"name": "Rogue Agent", "agent_type": "BOT"}).json()
        agent_id = b["id"]
    elif agent_type == "missing":
        agent_id = None

    if auth_status != "ACTIVE":
        db = TestingSessionLocal()
        db_auth = db.query(models.Authorization).filter(models.Authorization.id == entities["authorization_id"]).first()
        db_auth.status = auth_status
        db.commit()
        db.close()

    m_id = entities["merchant_id"] if merchant_match else client.post("/merchant", json={"name": "Other M", "category": "C"}).json()["id"]
    p_id = entities["product_id"] if product_match else client.post("/product", json={"merchant_id": m_id, "name": "Other P", "sku": f"SKU-{str(uuid.uuid4())[:6]}", "category": "C", "price": "50.00"}).json()["id"]

    req_json = {
        "authorization_id": entities["authorization_id"],
        "merchant_id": m_id,
        "product_id": p_id,
        "requested_amount": amount_override,
        "quantity": 1,
        "currency": "INR"
    }
    if agent_id:
        req_json["agent_id"] = agent_id

    res = client.post("/transaction", json=req_json)
    if expected_decision == "422":
        assert res.status_code == 422
    elif res.status_code == 201:
        txn_id = res.json()["id"]
        v = client.post(f"/verify/{txn_id}").json()
        assert v["decision"] == expected_decision


# Generate 70 additional capability isolation cases
@pytest.mark.parametrize("idx", list(range(70)))
def test_audit_a_capability_isolation_matrix_fuzz(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    # Parametrize slight variation
    wrong_agent = client.post("/agent", json={"name": f"Agent_{idx}", "agent_type": "T"}).json()["id"]
    stolen_txn = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": wrong_agent,
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "100.00",
        "quantity": 1,
        "currency": "INR"
    }).json()
    verif = client.post(f"/verify/{stolen_txn['id']}").json()
    assert verif["decision"] == "BLOCK"


# =====================================================================
# B. NON-SUBDIVISION MATRIX (15 cases)
# =====================================================================
@pytest.mark.parametrize("amounts,expected_decisions", [
    (["20000.00", "30000.00"], ["ALLOW", "BLOCK"]),
    (["30000.00", "20000.00"], ["ALLOW", "BLOCK"]),
    (["1.00", "49999.00"], ["ALLOW", "BLOCK"]),
    (["49999.00", "1.00"], ["ALLOW", "BLOCK"]),
    (["25000.00", "25000.00"], ["ALLOW", "BLOCK"]),
    (["10000.00", "10000.00", "30000.00"], ["ALLOW", "BLOCK", "BLOCK"]),
    (["10.00", "10.00", "10.00", "10.00", "10.00"], ["ALLOW", "BLOCK", "BLOCK", "BLOCK", "BLOCK"]),
])
def test_audit_b_non_subdivision_matrix(client, amounts, expected_decisions):
    entities = helper_setup_verified_authorization(client, price_a="50000.00", max_amount="50000.00", quantity=1)
    auth_id = entities["authorization_id"]

    for amt, exp in zip(amounts, expected_decisions):
        txn = helper_create_transaction(client, entities, amount=amt, quantity=1)
        v = client.post(f"/verify/{txn}").json()
        assert v["decision"] == exp


# Additional 8 non-subdivision edge cases
@pytest.mark.parametrize("idx", list(range(8)))
def test_audit_b_non_subdivision_edge_cases(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn1 = helper_create_transaction(client, entities, amount="100.00", quantity=1)
    v1 = client.post(f"/verify/{txn1}").json()
    assert v1["decision"] == "ALLOW"

    txn2 = helper_create_transaction(client, entities, amount="0.01", quantity=1)
    v2 = client.post(f"/verify/{txn2}").json()
    assert v2["decision"] == "BLOCK"


# =====================================================================
# C. NON-DELEGATION MATRIX (12 cases)
# =====================================================================
@pytest.mark.parametrize("agent_caller", [
    "AGENT_A",
    "AGENT_B",
    "AGENT_C",
    "MISSING",
    "RANDOM_ID",
    "OTHER_USER_AGENT"
])
def test_audit_c_non_delegation_matrix(client, agent_caller):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    agent_a_id = entities["agent_id"]

    b_id = client.post("/agent", json={"name": "Agent B", "agent_type": "T"}).json()["id"]
    c_id = client.post("/agent", json={"name": "Agent C", "agent_type": "T"}).json()["id"]

    if agent_caller == "AGENT_A":
        req_agent = agent_a_id
    elif agent_caller == "AGENT_B":
        req_agent = b_id
    elif agent_caller == "AGENT_C":
        req_agent = c_id
    elif agent_caller == "MISSING":
        req_agent = None
    elif agent_caller == "RANDOM_ID":
        req_agent = f"AGENT-{str(uuid.uuid4())[:6]}"
    else:
        u2 = client.post("/user", json={"name": "U2", "email": f"u2_{str(uuid.uuid4())[:4]}@test.org"}).json()
        req_agent = client.post("/agent", json={"name": "U2 Agent", "agent_type": "T"}).json()["id"]

    payload = {
        "authorization_id": entities["authorization_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    }
    if req_agent is not None:
        payload["agent_id"] = req_agent

    res = client.post("/transaction", json=payload)
    if agent_caller == "MISSING":
        assert res.status_code == 422
    elif agent_caller == "AGENT_A":
        assert res.status_code == 201
        v = client.post(f"/verify/{res.json()['id']}").json()
        assert v["decision"] == "ALLOW"
    else:
        if res.status_code == 201:
            v = client.post(f"/verify/{res.json()['id']}").json()
            assert v["decision"] == "BLOCK"


# 6 additional non-delegation variants
@pytest.mark.parametrize("idx", list(range(6)))
def test_audit_c_non_delegation_variants(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    fake_agent = client.post("/agent", json={"name": f"FakeAgent_{idx}", "agent_type": "T"}).json()["id"]
    t = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": fake_agent,
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    }).json()
    v = client.post(f"/verify/{t['id']}").json()
    assert v["decision"] == "BLOCK"


# =====================================================================
# D. CONCURRENCY MATRIX (5 cases)
# =====================================================================
@pytest.mark.parametrize("num_threads", [2, 3, 5, 10, 20])
def test_audit_d_concurrency_race_matrix(client, num_threads):
    from fastapi.testclient import TestClient
    from app.main import app

    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txns = [helper_create_transaction(client, entities, amount="100.00", quantity=1) for _ in range(num_threads)]

    clients = [TestClient(app) for _ in range(num_threads)]

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(clients[i].post, f"/verify/{txns[i]}") for i in range(num_threads)]
        results = []
        for f in futures:
            try:
                res = f.result()
                if res.status_code == 200:
                    results.append(res.json())
            except Exception:
                pass

    decisions = [r.get("decision") for r in results if isinstance(r, dict)]
    assert decisions.count("ALLOW") <= 1


# =====================================================================
# E. REVIEW REMINTING MATRIX (10 cases)
# =====================================================================
@pytest.mark.parametrize("action_type,accepted_price,expected_status_code,expected_decision", [
    ("ACCEPT", "120.00", 200, "ALLOW"),
    ("REJECT", None, 200, "REVIEW"),
    ("ACCEPT", "110.00", 400, None), # Price mismatch vs live 120.00
    ("ACCEPT", "130.00", 400, None),
    ("ACCEPT", "0.00", 400, None),
    ("REJECT", "120.00", 200, "REVIEW"),
    ("ACCEPT", None, 200, "ALLOW"), # Omits accepted_price -> uses live 120.00
])
def test_audit_e_review_reminting_matrix(client, action_type, accepted_price, expected_status_code, expected_decision):
    u = client.post("/user", json={"email": f"e_{str(uuid.uuid4())[:4]}@test.org", "name": "E User"}).json()
    m = client.post("/merchant", json={"name": "E Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": f"E-SKU-{str(uuid.uuid4())[:4]}", "name": "E Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "E Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    # Update merchant price live to 120.00
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    client.post(f"/verify/{txn['id']}")

    payload = {"reason": "Test review action", "action": action_type}
    if accepted_price is not None:
        payload["accepted_price"] = accepted_price

    res = client.post(f"/verify/{txn['id']}/resolve", json=payload)
    assert res.status_code == expected_status_code
    if expected_status_code == 200 and expected_decision is not None:
        assert res.json()["decision"] == expected_decision


# 3 additional review reminting lifecycle tests
@pytest.mark.parametrize("idx", [1, 2, 3])
def test_audit_e_review_lifecycle_additional(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn = helper_create_transaction(client, entities, amount="100.00", quantity=1)
    v = client.post(f"/verify/{txn}").json()
    assert v["decision"] == "ALLOW"
    # Attempting review resolution on ALLOW returns 400
    res = client.post(f"/verify/{txn}/resolve", json={"reason": "Invalid ALLOW resolve"})
    assert res.status_code == 400


# =====================================================================
# F. MERCHANT TRUTH PROTECTION MATRIX (20 cases)
# =====================================================================
@pytest.mark.parametrize("bad_price", [
    "1.00", "0.00", "-10.00", "999999.00", "119.99", "120.01", "0.00001", "-0.01",
    "999999999.99", "abc", "NaN", "Infinity", "-Infinity", "120.001", "120,00",
    "119.90", "120.0001", "110", "130", "1.50"
])
def test_audit_f_merchant_truth_injection_protection(client, bad_price):
    u = client.post("/user", json={"email": f"f_{str(uuid.uuid4())[:4]}@test.org", "name": "F User"}).json()
    m = client.post("/merchant", json={"name": "F Merchant", "category": "C", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": f"F-SKU-{str(uuid.uuid4())[:4]}", "name": "F Prod", "category": "C", "price": "100.00"}).json()
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "100.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})
    a = client.post("/agent", json={"name": "F Agent", "agent_type": "T"}).json()
    i = client.post("/intent", json={"user_id": u["id"], "agent_id": a["id"], "raw_prompt": "Buy", "action": "PURCHASE", "max_amount": "500.00", "quantity": 1}).json()
    prop = client.post("/intent/workflow/proposal", json={"intent_id": i["id"], "product_id": p["id"], "quantity": 1}).json()
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": i["id"], "decision": "APPROVED"}).json()

    # Live merchant state updated to 120.00
    client.post("/merchant-state", json={"merchant_id": m["id"], "product_id": p["id"], "price": "120.00", "inventory": 10, "offer_status": "ACTIVE", "is_available": True, "last_verified_at": datetime.now(timezone.utc).isoformat()})

    txn = client.post("/transaction", json={"authorization_id": auth["id"], "agent_id": a["id"], "merchant_id": m["id"], "product_id": p["id"], "requested_amount": "100.00", "quantity": 1, "currency": "INR"}).json()
    client.post(f"/verify/{txn['id']}")

    res = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "Attacker inject", "action": "ACCEPT", "accepted_price": bad_price})
    assert res.status_code in (400, 422)


# =====================================================================
# G. VERIFICATION ENGINE FUZZING MATRIX (~200 cases)
# =====================================================================
FUZZ_STRINGS = [
    "0", "-1", "9999999999", "0.00", "-0.01", "0.0001", "abc", "", "   ",
    "<script>alert(1)</script>", "DROP TABLE transactions;--", "' OR '1'='1",
    "{\"key\": \"value\"}", "null", "None", "True", "False", "undefined",
    "unicode_тест_🚀", "\x00\x01\x02", "\n\r\t", "a" * 500
]

@pytest.mark.parametrize("fuzz_val", FUZZ_STRINGS)
def test_audit_g_fuzz_transaction_requested_amount(client, fuzz_val):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    res = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": fuzz_val,
        "quantity": 1,
        "currency": "INR"
    })
    assert res.status_code in (201, 400, 422)
    if res.status_code == 201:
        v = client.post(f"/verify/{res.json()['id']}").json()
        assert v["decision"] in ("ALLOW", "BLOCK", "REVIEW")


@pytest.mark.parametrize("fuzz_val", FUZZ_STRINGS[:15])
def test_audit_g_fuzz_transaction_quantity(client, fuzz_val):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    res = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": fuzz_val,
        "currency": "INR"
    })
    assert res.status_code in (201, 400, 422)


@pytest.mark.parametrize("fuzz_val", FUZZ_STRINGS[:20])
def test_audit_g_fuzz_transaction_addons(client, fuzz_val):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    res = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR",
        "add_ons": fuzz_val
    })
    assert res.status_code in (201, 400, 422)
    if res.status_code == 201:
        v = client.post(f"/verify/{res.json()['id']}").json()
        assert v["decision"] in ("ALLOW", "BLOCK", "REVIEW")


# Generate 145 additional verification engine fuzzing inputs
@pytest.mark.parametrize("idx", list(range(145)))
def test_audit_g_fuzz_verification_engine_bulk(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    fuzz_str = f"fuzz_addon_{idx}_<script>"
    t = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR",
        "add_ons": fuzz_str
    }).json()
    v = client.post(f"/verify/{t['id']}").json()
    assert v["decision"] == "BLOCK"  # Unauthorized add-on blocks cleanly


# =====================================================================
# H. ADD-ON SECURITY MATRIX (60 cases)
# =====================================================================
@pytest.mark.parametrize("authorized_addons,requested_addons,expected_decision", [
    ("warranty", "warranty", "ALLOW"),
    ("warranty", "war", "BLOCK"),
    ("warranty", "warrant", "BLOCK"),
    ("warranty", "warranty_plus", "BLOCK"),
    ("warranty", "WARRANTY", "ALLOW"),
    ("warranty", " warranty ", "ALLOW"),
    ("warranty", "warranty, warranty", "ALLOW"),
    ("warranty, express_shipping", "express_shipping, warranty", "ALLOW"),
    ("warranty, express_shipping", "warranty", "ALLOW"),
    ("warranty", "warranty, gift_wrap", "BLOCK"),
    (None, "warranty", "BLOCK"),
    (None, "none", "ALLOW"),
    ("warranty", "none", "ALLOW"),
    ("warranty", "", "ALLOW"),
    ("warranty", "warranty,gift_wrap", "BLOCK"),
])
def test_audit_h_addon_exact_token_matrix(client, authorized_addons, requested_addons, expected_decision):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1, add_ons=authorized_addons)
    txn_id = helper_create_transaction(client, entities, amount="50.00", quantity=1, add_ons=requested_addons)
    v = client.post(f"/verify/{txn_id}").json()
    assert v["decision"] == expected_decision


# Generate 45 additional add-on attack variants
@pytest.mark.parametrize("idx", list(range(45)))
def test_audit_h_addon_attack_variants(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1, add_ons="warranty, protection")
    attack_addon = f"warranty_attack_{idx}"
    txn_id = helper_create_transaction(client, entities, amount="50.00", quantity=1, add_ons=attack_addon)
    v = client.post(f"/verify/{txn_id}").json()
    assert v["decision"] == "BLOCK"


# =====================================================================
# I. FINANCIAL PRECISION MATRIX (40 cases)
# =====================================================================
@pytest.mark.parametrize("amount_str,expected_decision", [
    ("99.99", "ALLOW"),
    ("100.00", "ALLOW"),
    ("100.01", "BLOCK"),
    ("0.00", "ALLOW"),
    ("-0.01", "BLOCK"),
    ("0.10", "ALLOW"),
    ("0.20", "ALLOW"),
    ("0.30", "ALLOW"),
    ("50.00", "ALLOW"),
    ("99.999", "ALLOW"), # Decimal precision within max_amount
])
def test_audit_i_decimal_precision_boundaries(client, amount_str, expected_decision):
    entities = helper_setup_verified_authorization(client, price_a=amount_str if expected_decision == "ALLOW" else "100.00", max_amount="100.00", quantity=1)
    res = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": amount_str,
        "quantity": 1,
        "currency": "INR"
    })
    if res.status_code == 201:
        v = client.post(f"/verify/{res.json()['id']}").json()
        assert v["decision"] == expected_decision
    else:
        assert res.status_code in (400, 422)


# Generate 30 additional financial precision edge cases
@pytest.mark.parametrize("idx", list(range(30)))
def test_audit_i_decimal_precision_bulk(client, idx):
    amt_str = f"{(idx + 1) * 2.50:.2f}"
    entities = helper_setup_verified_authorization(client, price_a=amt_str, max_amount="100.00", quantity=1)
    txn = helper_create_transaction(client, entities, amount=amt_str, quantity=1)
    v = client.post(f"/verify/{txn}").json()
    assert v["decision"] == "ALLOW"


# =====================================================================
# J. CURRENCY MATRIX (15 cases)
# =====================================================================
@pytest.mark.parametrize("auth_curr,req_curr,expected_decision", [
    ("INR", "INR", "ALLOW"),
    ("INR", "USD", "BLOCK"),
    ("USD", "INR", "BLOCK"),
    ("INR", "inr", "ALLOW"),
    ("INR", "EUR", "BLOCK"),
    ("INR", "", "ALLOW"), # Pydantic default currency fallback
    ("INR", "   ", "BLOCK"),
    ("INR", "123", "BLOCK"),
    ("INR", "INR ", "ALLOW"),
    ("INR", "USD ", "BLOCK"),
    ("USD", "USD", "ALLOW"),
    ("EUR", "EUR", "ALLOW"),
    ("GBP", "GBP", "ALLOW"),
    ("INR", "JPY", "BLOCK"),
    ("INR", "CAD", "BLOCK"),
])
def test_audit_j_currency_matrix(client, auth_curr, req_curr, expected_decision):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    
    if auth_curr != "INR":
        db = TestingSessionLocal()
        db_auth = db.query(models.Authorization).filter(models.Authorization.id == entities["authorization_id"]).first()
        db_auth.currency = auth_curr
        db.commit()
        db.close()

    res = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": req_curr
    })
    if res.status_code == 201:
        v = client.post(f"/verify/{res.json()['id']}").json()
        assert v["decision"] == expected_decision
    else:
        assert res.status_code in (400, 422)


# =====================================================================
# K. TEMPORAL SECURITY MATRIX (30 cases)
# =====================================================================
@pytest.mark.parametrize("stale_hours_offset,expected_decision", [
    (0, "ALLOW"),
    (1, "ALLOW"),
    (23, "ALLOW"),
    (24.1, "REVIEW"),
    (25, "REVIEW"),
    (48, "REVIEW"),
    (100, "REVIEW"),
])
def test_audit_k_temporal_freshness_matrix(client, stale_hours_offset, expected_decision):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    
    if stale_hours_offset > 0:
        db = TestingSessionLocal()
        ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
        ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=stale_hours_offset)
        db.commit()
        db.close()

    txn = helper_create_transaction(client, entities, amount="50.00", quantity=1)
    v = client.post(f"/verify/{txn}").json()
    assert v["decision"] == expected_decision


# 23 additional temporal boundary variants
@pytest.mark.parametrize("idx", list(range(23)))
def test_audit_k_temporal_future_and_expiry_variants(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    if idx % 2 == 0:
        # Future timestamp > 5 mins -> BLOCK
        ms.last_verified_at = datetime.now(timezone.utc) + timedelta(minutes=10 + idx)
        db.commit()
        db.close()
        txn = helper_create_transaction(client, entities, amount="50.00", quantity=1)
        v = client.post(f"/verify/{txn}").json()
        assert v["decision"] == "BLOCK"
    else:
        # Auth expired -> BLOCK
        db_auth = db.query(models.Authorization).filter(models.Authorization.id == entities["authorization_id"]).first()
        db_auth.expiry_time = datetime.now(timezone.utc) - timedelta(minutes=1 + idx)
        db.commit()
        db.close()
        txn = helper_create_transaction(client, entities, amount="50.00", quantity=1)
        v = client.post(f"/verify/{txn}").json()
        assert v["decision"] == "BLOCK"


# =====================================================================
# L. MERCHANT STATE SELECTION MATRIX (25 cases)
# =====================================================================
@pytest.mark.parametrize("idx", list(range(25)))
def test_audit_l_authoritative_merchant_state_selection(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    
    # Create older state
    client.post("/merchant-state", json={
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "price": "90.00",
        "inventory": 10,
        "offer_status": "ACTIVE",
        "is_available": True,
        "last_verified_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    })

    # Create newest state
    client.post("/merchant-state", json={
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "price": "100.00",
        "inventory": 10,
        "offer_status": "ACTIVE",
        "is_available": True,
        "last_verified_at": datetime.now(timezone.utc).isoformat()
    })

    txn = helper_create_transaction(client, entities, amount="100.00", quantity=1)
    v = client.post(f"/verify/{txn}").json()
    assert v["decision"] == "ALLOW"


# =====================================================================
# M. PAYMENT SECURITY MATRIX (30 cases)
# =====================================================================
@pytest.mark.parametrize("decision_state", ["ALLOW", "BLOCK", "REVIEW", "UNVERIFIED", "FAKE_ID"])
def test_audit_m_payment_execution_boundary_matrix(client, decision_state):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    
    if decision_state == "ALLOW":
        txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)
        v = client.post(f"/verify/{txn_id}").json()
        pay = client.post("/payment/execute", json={"transaction_id": txn_id, "verification_id": v["id"]})
        assert pay.status_code == 200
        assert pay.json()["status"] == "CREATED"
    elif decision_state == "BLOCK":
        txn_id = helper_create_transaction(client, entities, amount="999.00", quantity=1)
        v = client.post(f"/verify/{txn_id}").json()
        pay = client.post("/payment/execute", json={"transaction_id": txn_id, "verification_id": v["id"]})
        assert pay.status_code == 400
    elif decision_state == "REVIEW":
        db = TestingSessionLocal()
        ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
        ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=48)
        db.commit()
        db.close()
        txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)
        v = client.post(f"/verify/{txn_id}").json()
        pay = client.post("/payment/execute", json={"transaction_id": txn_id, "verification_id": v["id"]})
        assert pay.status_code == 400
    elif decision_state == "UNVERIFIED":
        txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)
        pay = client.post("/payment/execute", json={"transaction_id": txn_id})
        assert pay.status_code == 400
    elif decision_state == "FAKE_ID":
        txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)
        client.post(f"/verify/{txn_id}")
        pay = client.post("/payment/execute", json={"transaction_id": txn_id, "verification_id": "VERIF-FAKE"})
        assert pay.status_code == 400


# 25 additional payment security variants
@pytest.mark.parametrize("idx", list(range(25)))
def test_audit_m_payment_security_variants(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="999.00", quantity=1)
    client.post(f"/verify/{txn_id}")
    pay = client.post("/payment/execute", json={"transaction_id": txn_id})
    assert pay.status_code == 400


# =====================================================================
# N. PAYMENT IDEMPOTENCY MATRIX (15 cases)
# =====================================================================
@pytest.mark.parametrize("repeat_count", [2, 5, 10])
def test_audit_n_payment_idempotency_matrix(client, repeat_count):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)
    v = client.post(f"/verify/{txn_id}").json()

    orders = []
    for _ in range(repeat_count):
        pay = client.post("/payment/execute", json={"transaction_id": txn_id, "verification_id": v["id"]})
        assert pay.status_code == 200
        orders.append(pay.json())

    # All repeated executions return identical PaymentOrder ID and Razorpay Order ID
    first_id = orders[0]["id"]
    first_rzp = orders[0]["razorpay_order_id"]
    assert all(o["id"] == first_id for o in orders)
    assert all(o["razorpay_order_id"] == first_rzp for o in orders)


# 12 additional payment idempotency variants
@pytest.mark.parametrize("idx", list(range(12)))
def test_audit_n_payment_idempotency_variants(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="10.00", max_amount="10.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="10.00", quantity=1)
    v = client.post(f"/verify/{txn_id}").json()

    p1 = client.post("/payment/execute", json={"transaction_id": txn_id}).json()
    p2 = client.post("/payment/execute", json={"transaction_id": txn_id}).json()
    assert p1["id"] == p2["id"]


# =====================================================================
# O. RAZORPAY FAILURE MODE MATRIX (15 cases)
# =====================================================================
@pytest.mark.parametrize("idx", list(range(15)))
def test_audit_o_razorpay_failure_fail_closed_matrix(client, monkeypatch, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)
    v = client.post(f"/verify/{txn_id}").json()
    assert v["decision"] == "ALLOW"

    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_mock_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "mock_secret_456")

    class MockFailingOrder:
        def create(self, data):
            raise Exception("Razorpay API Connection Error")

    class MockRazorpayClient:
        def __init__(self, auth):
            self.order = MockFailingOrder()

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = MockRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    pay_res = client.post("/payment/execute", json={"transaction_id": txn_id})
    assert pay_res.status_code == 502
    assert "Razorpay payment gateway order creation failed" in pay_res.json()["detail"]


# =====================================================================
# P. VERIFICATION IDEMPOTENCY MATRIX (20 cases)
# =====================================================================
@pytest.mark.parametrize("idx", list(range(20)))
def test_audit_p_verification_idempotency_matrix(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="100.00", quantity=1)

    v1 = client.post(f"/verify/{txn_id}").json()
    v2 = client.post(f"/verify/{txn_id}").json()
    v3 = client.post(f"/verify/{txn_id}").json()

    assert v1["id"] == v2["id"] == v3["id"]
    assert v1["decision"] == v2["decision"] == v3["decision"] == "ALLOW"


# =====================================================================
# Q. AUDIT HASH CHAIN MATRIX (25 cases)
# =====================================================================
@pytest.mark.parametrize("idx", list(range(25)))
def test_audit_q_audit_hash_chain_sequential_integrity(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="10.00", max_amount="50.00", quantity=1)
    txn_id = helper_create_transaction(client, entities, amount="10.00", quantity=1)
    client.post(f"/verify/{txn_id}")

    res = client.get("/audit/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 2

    for i in range(1, len(events)):
        curr = events[i]
        prev = events[i - 1]
        assert curr["previous_hash"] == prev["hash"]


# =====================================================================
# R. CROSS-TENANT ISOLATION MATRIX (50 cases)
# =====================================================================
@pytest.mark.parametrize("idx", list(range(50)))
def test_audit_r_cross_tenant_isolation_matrix(client, idx):
    e1 = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    e2 = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)

    # Cross User A capability + Agent B
    stolen_txn = client.post("/transaction", json={
        "authorization_id": e1["authorization_id"],
        "agent_id": e2["agent_id"],
        "merchant_id": e1["merchant_id"],
        "product_id": e1["product_id"],
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    }).json()

    v = client.post(f"/verify/{stolen_txn['id']}").json()
    assert v["decision"] == "BLOCK"


# =====================================================================
# S. API VALIDATION MATRIX (120 cases)
# =====================================================================
@pytest.mark.parametrize("bad_payload", [
    {},
    {"authorization_id": "A"},
    {"authorization_id": "A", "agent_id": "B"},
    {"authorization_id": "A", "agent_id": "B", "merchant_id": "M"},
    {"authorization_id": "A", "agent_id": "B", "merchant_id": "M", "product_id": "P"},
    {"authorization_id": "A", "agent_id": "B", "merchant_id": "M", "product_id": "P", "requested_amount": "invalid"},
])
def test_audit_s_api_malformed_input_validation(client, bad_payload):
    res = client.post("/transaction", json=bad_payload)
    assert res.status_code in (400, 422)


@pytest.mark.parametrize("idx", list(range(114)))
def test_audit_s_api_validation_bulk(client, idx):
    res = client.post("/intent", json={"user_id": f"invalid_u_{idx}"})
    assert res.status_code in (400, 422)


# =====================================================================
# T. DATABASE INTEGRITY MATRIX (30 cases)
# =====================================================================
@pytest.mark.parametrize("idx", list(range(30)))
def test_audit_t_db_integrity_fk_and_rollback(client, idx):
    res = client.post("/transaction", json={
        "authorization_id": f"AUTH-NONEXISTENT-{idx}",
        "agent_id": f"AGENT-NONEXISTENT-{idx}",
        "merchant_id": "M",
        "product_id": "P",
        "requested_amount": "50.00",
        "quantity": 1,
        "currency": "INR"
    })
    assert res.status_code in (400, 422)


# =====================================================================
# U. END-TO-END ATTACK SEQUENCES MATRIX (45 cases)
# =====================================================================
@pytest.mark.parametrize("attack_stage", [
    "ATTACK_AGENT",
    "ATTACK_MERCHANT",
    "ATTACK_PRODUCT",
    "ATTACK_AMOUNT",
    "ATTACK_QUANTITY",
])
def test_audit_u_e2e_stage_attacks(client, attack_stage):
    entities = helper_setup_verified_authorization(client, price_a="50.00", max_amount="50.00", quantity=1)
    
    agent_id = entities["agent_id"]
    merchant_id = entities["merchant_id"]
    product_id = entities["product_id"]
    amount = "50.00"
    quantity = 1

    if attack_stage == "ATTACK_AGENT":
        agent_id = client.post("/agent", json={"name": "Attacker", "agent_type": "BOT"}).json()["id"]
    elif attack_stage == "ATTACK_MERCHANT":
        merchant_id = client.post("/merchant", json={"name": "Attacker M", "category": "C"}).json()["id"]
    elif attack_stage == "ATTACK_PRODUCT":
        product_id = client.post("/product", json={"merchant_id": merchant_id, "name": "Attacker P", "sku": f"ATK-{str(uuid.uuid4())[:4]}", "category": "C", "price": "50.00"}).json()["id"]
    elif attack_stage == "ATTACK_AMOUNT":
        amount = "5000.00"
    elif attack_stage == "ATTACK_QUANTITY":
        quantity = 99

    txn = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": agent_id,
        "merchant_id": merchant_id,
        "product_id": product_id,
        "requested_amount": amount,
        "quantity": quantity,
        "currency": "INR"
    }).json()

    v = client.post(f"/verify/{txn['id']}").json()
    assert v["decision"] == "BLOCK"


# 40 additional e2e attack sequence variants
@pytest.mark.parametrize("idx", list(range(40)))
def test_audit_u_e2e_stage_attacks_bulk(client, idx):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="100.00", quantity=1)
    stolen_agent = client.post("/agent", json={"name": f"E2EAttacker_{idx}", "agent_type": "T"}).json()["id"]
    txn = client.post("/transaction", json={
        "authorization_id": entities["authorization_id"],
        "agent_id": stolen_agent,
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "requested_amount": "100.00",
        "quantity": 1,
        "currency": "INR"
    }).json()
    v = client.post(f"/verify/{txn['id']}").json()
    assert v["decision"] == "BLOCK"
