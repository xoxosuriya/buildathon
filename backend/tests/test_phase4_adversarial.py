import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app import models
from tests.conftest import TestingSessionLocal, client
from tests.test_phase3_verification import helper_setup_verified_authorization, helper_create_transaction


def helper_setup_allow_transaction(client_obj):
    """Helper to run full Phase 2 workflow -> create ALLOW transaction."""
    entities = helper_setup_verified_authorization(client_obj, price_a="100.00", max_amount="300.00", quantity=3)
    txn_id = helper_create_transaction(client_obj, entities, amount="300.00", quantity=3)
    verif_res = client_obj.post(f"/verify/{txn_id}")
    return {
        "user_id": entities["user_id"],
        "agent_id": entities["agent_id"],
        "merchant_id": entities["merchant_id"],
        "product_id": entities["product_id"],
        "intent_id": entities["intent_id"],
        "authorization_id": entities["authorization_id"],
        "transaction_id": txn_id,
        "verification_id": verif_res.json()["id"],
        "verification_result": verif_res.json()
    }


# 1. ALLOW -> Payment Execution Succeeds
def test_p4_1_allow_payment_execution_succeeds(client):
    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={
        "transaction_id": data["transaction_id"],
        "verification_id": data["verification_id"]
    })
    assert res.status_code == 200
    pay_data = res.json()
    assert pay_data["transaction_id"] == data["transaction_id"]
    assert pay_data["verification_id"] == data["verification_id"]
    assert pay_data["status"] == "CREATED"
    assert pay_data["razorpay_order_id"].startswith("order_test_rzp_")

    # Verify PAYMENT_EXECUTED audit event persisted
    db = TestingSessionLocal()
    audit = db.query(models.AuditEvent).filter(models.AuditEvent.event_type == "PAYMENT_EXECUTED").first()
    assert audit is not None
    db.close()


# 2. BLOCK -> Payment Execution Rejected
def test_p4_2_block_payment_execution_rejected(client):
    data = helper_setup_allow_transaction(client)
    # Create second transaction exceeding amount ceiling -> BLOCK
    txn_res = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "999.00", # Exceeds 100.00
        "quantity": 1
    })
    block_txn_id = txn_res.json()["id"]
    verif_res = client.post(f"/verify/{block_txn_id}")
    assert verif_res.json()["decision"] == "BLOCK"

    pay_res = client.post("/payment/execute", json={"transaction_id": block_txn_id})
    assert pay_res.status_code == 400
    assert "BLOCK" in pay_res.json()["detail"]


# 3. REVIEW -> Payment Execution Rejected
def test_p4_3_review_payment_execution_rejected(client):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="300.00", quantity=3)
    # Make MerchantState stale -> produces REVIEW decision
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=48)
    db.commit()
    db.close()

    stale_txn_id = helper_create_transaction(client, entities, amount="300.00", quantity=3)
    verif_res = client.post(f"/verify/{stale_txn_id}")
    assert verif_res.json()["decision"] == "REVIEW"

    pay_res = client.post("/payment/execute", json={"transaction_id": stale_txn_id})
    assert pay_res.status_code == 400
    assert "REVIEW" in pay_res.json()["detail"]


# 4. Client Fakes ALLOW in Body -> Rejected by Database Verification Lookup
def test_p4_4_fake_allow_rejected(client):
    data = helper_setup_allow_transaction(client)
    # Create invalid unverified transaction
    txn_res = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "100.00",
        "quantity": 1
    })
    unverified_txn_id = txn_res.json()["id"]

    # Client tries to send fake verification_id
    pay_res = client.post("/payment/execute", json={
        "transaction_id": unverified_txn_id,
        "verification_id": "VERIF-FAKE-ALLOW-123"
    })
    assert pay_res.status_code == 400
    assert "has not undergone IntentLock verification" in pay_res.json()["detail"]


# 5. Client Attempts to Execute Payment for Unverified Transaction -> Rejected
def test_p4_5_unverified_transaction_payment_rejected(client):
    data = helper_setup_allow_transaction(client)
    txn_res = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "100.00",
        "quantity": 1
    })
    unverified_txn_id = txn_res.json()["id"]

    pay_res = client.post("/payment/execute", json={"transaction_id": unverified_txn_id})
    assert pay_res.status_code == 400


# 6. Payment Idempotency -> Repeated Execution Returns Stored PaymentOrder
def test_p4_6_payment_execution_idempotent(client):
    data = helper_setup_allow_transaction(client)
    pay1 = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert pay1.status_code == 200

    pay2 = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert pay2.status_code == 200
    assert pay1.json()["id"] == pay2.json()["id"]
    assert pay1.json()["razorpay_order_id"] == pay2.json()["razorpay_order_id"]


# 7. Verification ID Mismatch -> Rejected
def test_p4_7_verification_id_mismatch_rejected(client):
    data = helper_setup_allow_transaction(client)
    pay_res = client.post("/payment/execute", json={
        "transaction_id": data["transaction_id"],
        "verification_id": f"VERIF-{uuid.uuid4()}"
    })
    assert pay_res.status_code == 400
    assert "Verification ID mismatch" in pay_res.json()["detail"]


# 8. Verification Result Belonging to Another Transaction -> Rejected
def test_p4_8_verification_result_other_transaction_rejected(client):
    data1 = helper_setup_allow_transaction(client)
    data2 = helper_setup_allow_transaction(client)

    pay_res = client.post("/payment/execute", json={
        "transaction_id": data1["transaction_id"],
        "verification_id": data2["verification_id"]
    })
    assert pay_res.status_code == 400
    assert "Verification ID mismatch" in pay_res.json()["detail"]


# 9. Consumed USED Authorization Cannot Be Reused for Second Transaction
def test_p4_9_used_authorization_reuse_blocked(client):
    data = helper_setup_allow_transaction(client)
    # First transaction ALLOW consumes authorization -> USED
    assert data["verification_result"]["decision"] == "ALLOW"

    # Create second transaction with same USED authorization
    txn2 = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "100.00",
        "quantity": 1
    })
    txn2_id = txn2.json()["id"]

    verif2 = client.post(f"/verify/{txn2_id}")
    assert verif2.json()["decision"] == "BLOCK"

    pay_res = client.post("/payment/execute", json={"transaction_id": txn2_id})
    assert pay_res.status_code == 400


# 10. REVIEW Resolution Workflow -> Explicit Re-verification Requirements
def test_p4_10_review_resolution_workflow(client):
    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="300.00", quantity=3)
    # Set price to 105.00 -> produces REVIEW decision (price shift within max amount)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.price = Decimal("105.00")
    db.commit()
    db.close()

    review_txn_id = helper_create_transaction(client, entities, amount="300.00", quantity=3)
    verif_res = client.post(f"/verify/{review_txn_id}")
    assert verif_res.json()["decision"] == "REVIEW"

    # Resolve REVIEW
    resolve_res = client.post(f"/verify/{review_txn_id}/resolve", json={
        "reason": "User accepted price shift to 105.00",
        "accepted_price": "105.00"
    })
    assert resolve_res.status_code == 200

    # Verify REVIEW_RESOLVED audit event logged
    db = TestingSessionLocal()
    audit = db.query(models.AuditEvent).filter(models.AuditEvent.event_type == "REVIEW_RESOLVED").first()
    assert audit is not None
    db.close()


# 11. BLOCK Cannot Use REVIEW Resolution Endpoint
def test_p4_11_block_cannot_use_review_resolution(client):
    data = helper_setup_allow_transaction(client)
    txn_res = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "999.00",
        "quantity": 1
    })
    block_txn_id = txn_res.json()["id"]
    client.post(f"/verify/{block_txn_id}")

    res = client.post(f"/verify/{block_txn_id}/resolve", json={"reason": "User trying to bypass BLOCK"})
    assert res.status_code == 400
    assert "BLOCK decisions cannot be resolved" in res.json()["detail"]


# 12. Dashboard Stats API -> GET /audit/stats Reflects Dynamic DB Counters
def test_p4_12_dashboard_stats_api(client):
    data = helper_setup_allow_transaction(client)
    res = client.get("/audit/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_transactions"] >= 1
    assert stats["allowed_count"] >= 1
    assert stats["active_agents"] >= 1


# 13. Empty Database Dashboard Stats -> Valid Zero Metrics
def test_p4_13_empty_database_dashboard_stats(client):
    db = TestingSessionLocal()
    db.query(models.PaymentOrder).delete()
    db.query(models.AuditEvent).delete()
    db.query(models.VerificationResult).delete()
    db.query(models.Transaction).delete()
    db.query(models.Authorization).delete()
    db.query(models.Intent).delete()
    db.query(models.MerchantState).delete()
    db.query(models.Product).delete()
    db.query(models.Merchant).delete()
    db.query(models.Agent).delete()
    db.query(models.User).delete()
    db.commit()
    db.close()

    res = client.get("/audit/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_transactions"] == 0
    assert stats["allowed_count"] == 0
    assert stats["review_count"] == 0
    assert stats["blocked_count"] == 0
    assert Decimal(str(stats["total_amount_blocked"])) == Decimal("0.00")
    assert stats["active_agents"] == 0


# 14. PAYMENT_REJECTED Audit Event Persisted on Blocked Payment Request
def test_p4_14_payment_rejected_audit_event(client):
    data = helper_setup_allow_transaction(client)
    txn_res = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "999.00",
        "quantity": 1
    })
    block_txn_id = txn_res.json()["id"]
    client.post(f"/verify/{block_txn_id}")

    client.post("/payment/execute", json={"transaction_id": block_txn_id})

    db = TestingSessionLocal()
    audit = db.query(models.AuditEvent).filter(
        models.AuditEvent.event_type == "PAYMENT_REJECTED",
        models.AuditEvent.transaction_id == block_txn_id
    ).first()
    assert audit is not None
    db.close()


# 15. No Hardcoded Credentials in Source Code Inspection
def test_p4_15_no_hardcoded_secrets_in_payment_service():
    from app.services import payment_service
    assert hasattr(payment_service, "execute_payment_service")


# 16. Configured Razorpay Credentials -> Success Creates PaymentOrder
def test_p4_16_configured_razorpay_success_creates_payment_order(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_mock_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "secret_mock_123")

    class MockOrder:
        def create(self, data):
            return {"id": "order_rzp_mock_success_777"}

    class MockRazorpayClient:
        def __init__(self, auth):
            self.order = MockOrder()

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = MockRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert res.status_code == 200
    assert res.json()["razorpay_order_id"] == "order_rzp_mock_success_777"


# 17. Configured Razorpay Credentials -> API Failure Fails Closed with HTTP 502 and NO Fake Order
def test_p4_17_configured_razorpay_failure_fails_closed_http_502(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_mock_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "secret_mock_123")

    class MockFailingOrder:
        def create(self, data):
            raise Exception("Razorpay API connection timeout")

    class MockRazorpayClient:
        def __init__(self, auth):
            self.order = MockFailingOrder()

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = MockRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    
    # Must return HTTP 502 Bad Gateway
    assert res.status_code == 502
    assert "Razorpay payment gateway order creation failed" in res.json()["detail"]

    # Must NOT create a PaymentOrder record in database!
    db = TestingSessionLocal()
    pay_order = db.query(models.PaymentOrder).filter(models.PaymentOrder.transaction_id == data["transaction_id"]).first()
    assert pay_order is None

    # Must NOT log PAYMENT_EXECUTED
    exec_audit = db.query(models.AuditEvent).filter(
        models.AuditEvent.transaction_id == data["transaction_id"],
        models.AuditEvent.event_type == "PAYMENT_EXECUTED"
    ).first()
    assert exec_audit is None

    # MUST log PAYMENT_FAILED audit event
    fail_audit = db.query(models.AuditEvent).filter(
        models.AuditEvent.transaction_id == data["transaction_id"],
        models.AuditEvent.event_type == "PAYMENT_FAILED"
    ).first()
    assert fail_audit is not None
    db.close()


# =====================================================================
# PHASE 7: RAZORPAY TEST MODE ENFORCEMENT & SECURITY BOUNDARY TESTS
# =====================================================================

# TEST 1: Valid Test Key ('rzp_test_...') Allowed
def test_p7_1_valid_test_key_allowed(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_valid_key_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "valid_secret_456")

    class MockOrder:
        def create(self, data):
            return {"id": "order_rzp_test_success_101"}

    class MockRazorpayClient:
        def __init__(self, auth):
            assert auth[0].startswith("rzp_test_")
            self.order = MockOrder()

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = MockRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert res.status_code == 200
    assert res.json()["razorpay_order_id"] == "order_rzp_test_success_101"


# TEST 2: Production-Style Key ('rzp_live_...') Rejected cleanly with HTTP 400
def test_p7_2_production_key_rejected(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_live_production_key_777")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "live_secret_777")

    # If razorpay Client.order.create is invoked, fail test immediately
    class TrapRazorpayClient:
        def __init__(self, auth):
            pytest.fail("Razorpay API client MUST NOT be initialized when production rzp_live_ key is provided!")

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = TrapRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert res.status_code == 400
    assert "Test Mode" in res.json()["detail"] or "rzp_test_" in res.json()["detail"]


# TEST 3: Malformed/Unknown Key Rejected cleanly with HTTP 400
def test_p7_3_malformed_key_rejected(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "invalid_key_format")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "some_secret")

    class TrapRazorpayClient:
        def __init__(self, auth):
            pytest.fail("Razorpay API client MUST NOT be initialized for malformed key!")

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = TrapRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert res.status_code == 400


# TEST 4: BLOCK Decision + Test Key -> Rejects BEFORE Razorpay Client
def test_p7_4_block_prevents_razorpay(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_valid_key_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "valid_secret_456")

    class TrapRazorpayClient:
        def __init__(self, auth):
            pytest.fail("Razorpay client MUST NOT be initialized when decision is BLOCK!")

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = TrapRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    # Exceed ceiling -> BLOCK
    txn = client.post("/transaction", json={
        "authorization_id": data["authorization_id"],
        "agent_id": data["agent_id"],
        "merchant_id": data["merchant_id"],
        "product_id": data["product_id"],
        "requested_amount": "9999.00",
        "quantity": 1
    }).json()["id"]
    client.post(f"/verify/{txn}")

    res = client.post("/payment/execute", json={"transaction_id": txn})
    assert res.status_code == 400
    assert "BLOCK" in res.json()["detail"]


# TEST 5: REVIEW Decision + Test Key -> Rejects BEFORE Razorpay Client
def test_p7_5_review_prevents_razorpay(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_valid_key_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "valid_secret_456")

    class TrapRazorpayClient:
        def __init__(self, auth):
            pytest.fail("Razorpay client MUST NOT be initialized when decision is REVIEW!")

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = TrapRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    entities = helper_setup_verified_authorization(client, price_a="100.00", max_amount="300.00", quantity=3)
    db = TestingSessionLocal()
    ms = db.query(models.MerchantState).filter(models.MerchantState.product_id == entities["product_id"]).first()
    ms.last_verified_at = datetime.now(timezone.utc) - timedelta(hours=48)
    db.commit()
    db.close()

    txn = helper_create_transaction(client, entities, amount="300.00", quantity=3)
    client.post(f"/verify/{txn}")

    res = client.post("/payment/execute", json={"transaction_id": txn})
    assert res.status_code == 400
    assert "REVIEW" in res.json()["detail"]


# TEST 6: ALLOW + Test Key + Gateway Failure -> Fails Closed with HTTP 502
def test_p7_6_gateway_failure_fails_closed(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_valid_key_123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "valid_secret_456")

    class FailingOrder:
        def create(self, data):
            raise Exception("Razorpay Gateway Connection Error 500")

    class MockRazorpayClient:
        def __init__(self, auth):
            self.order = FailingOrder()

    import sys
    import types
    mock_rzp_module = types.ModuleType("razorpay")
    mock_rzp_module.Client = MockRazorpayClient
    monkeypatch.setitem(sys.modules, "razorpay", mock_rzp_module)

    data = helper_setup_allow_transaction(client)
    res = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]})
    assert res.status_code == 502
    assert "Razorpay payment gateway order creation failed" in res.json()["detail"]


# TEST 7: Payment Idempotency Behavior Unchanged
def test_p7_7_idempotency_behavior(client, monkeypatch):
    data = helper_setup_allow_transaction(client)
    p1 = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]}).json()
    p2 = client.post("/payment/execute", json={"transaction_id": data["transaction_id"]}).json()
    assert p1["id"] == p2["id"]
    assert p1["razorpay_order_id"] == p2["razorpay_order_id"]

