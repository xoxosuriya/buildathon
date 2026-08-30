from decimal import Decimal
from sqlalchemy import inspect
from tests.conftest import engine


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "INTENTLOCK API"
    assert data["phase"] == 1


def test_openapi_docs(client):
    response = client.get("/docs")
    assert response.status_code == 200


def test_verify_stub(client):
    """Verify Phase 3 verification router endpoint."""
    response = client.post("/verify", json={"transaction_id": "non_existent_id"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Transaction not found"


def test_payment_stub(client):
    response = client.post("/payment")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "stub"


def test_all_10_tables_exist():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    expected_tables = [
        "users",
        "agents",
        "merchants",
        "products",
        "merchant_states",
        "intents",
        "authorizations",
        "transactions",
        "verification_results",
        "audit_events",
    ]
    for table in expected_tables:
        assert table in tables, f"Table {table} missing from database schema"


def test_crud_flow_and_decimal_financial_fields(client):
    # 1. User CRUD
    u_res = client.post("/user", json={"name": "Alice Developer", "email": "alice@example.com"})
    assert u_res.status_code == 201, u_res.text
    user = u_res.json()
    user_id = user["id"]

    # Read user list and single user
    users_list = client.get("/user")
    assert users_list.status_code == 200
    assert any(u["id"] == user_id for u in users_list.json())

    single_user = client.get(f"/user/{user_id}")
    assert single_user.status_code == 200
    assert single_user.json()["email"] == "alice@example.com"

    # 2. Agent CRUD
    a_res = client.post("/agent", json={"name": "ShopBot Agent", "agent_type": "COMMERCE_ASSISTANT"})
    assert a_res.status_code == 201, a_res.text
    agent = a_res.json()
    agent_id = agent["id"]

    # 3. Merchant CRUD
    m_res = client.post("/merchant", json={"name": "TechStore XYZ", "category": "ELECTRONICS"})
    assert m_res.status_code == 201, m_res.text
    merchant = m_res.json()
    merchant_id = merchant["id"]

    # 4. Product CRUD
    p_res = client.post(
        "/product",
        json={
            "merchant_id": merchant_id,
            "name": "Lenovo Laptop Model X",
            "sku": "LEN-001",
            "category": "LAPTOP",
            "price": "69999.00",
            "is_active": True,
        },
    )
    assert p_res.status_code == 201, p_res.text
    product = p_res.json()
    product_id = product["id"]
    assert Decimal(str(product["price"])) == Decimal("69999.00")

    # 5. MerchantState CRUD
    ms_res = client.post(
        "/merchant-state",
        json={
            "merchant_id": merchant_id,
            "product_id": product_id,
            "price": "69999.00",
            "inventory": 5,
            "offer_status": "ACTIVE",
            "is_available": True,
        },
    )
    assert ms_res.status_code == 201, ms_res.text
    ms = ms_res.json()
    assert Decimal(str(ms["price"])) == Decimal("69999.00")

    # 6. Intent CRUD (linking user_id and agent_id)
    i_res = client.post(
        "/intent",
        json={
            "user_id": user_id,
            "agent_id": agent_id,
            "raw_prompt": "Buy me a laptop under 70000",
            "action": "PURCHASE",
            "category": "LAPTOP",
            "max_amount": "70000.00",
            "quantity": 1,
        },
    )
    assert i_res.status_code == 201, i_res.text
    intent = i_res.json()
    intent_id = intent["id"]
    assert Decimal(str(intent["max_amount"])) == Decimal("70000.00")

    # 7. Authorization CRUD
    auth_res = client.post(
        "/authorization",
        json={
            "intent_id": intent_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "merchant_id": merchant_id,
            "product_id": product_id,
            "action": "PURCHASE",
            "quantity": 1,
            "max_amount": "70000.00",
            "currency": "INR",
            "allowed_add_ons": "none",
            "confirmation_required": True,
        },
    )
    assert auth_res.status_code == 201, auth_res.text
    auth = auth_res.json()
    auth_id = auth["id"]
    assert Decimal(str(auth["max_amount"])) == Decimal("70000.00")

    # 8. Transaction CRUD
    tx_res = client.post(
        "/transaction",
        json={
            "authorization_id": auth_id,
            "agent_id": agent_id,
            "merchant_id": merchant_id,
            "product_id": product_id,
            "requested_amount": "69999.00",
            "quantity": 1,
            "add_ons": "none",
        },
    )
    assert tx_res.status_code == 201, tx_res.text
    tx = tx_res.json()
    tx_id = tx["id"]
    assert Decimal(str(tx["requested_amount"])) == Decimal("69999.00")

    # 9. AuditEvent Append-Only Test (CREATE & READ)
    audit_res = client.post(
        "/audit",
        json={
            "trace_id": "trace-101",
            "event_type": "INTENT_RECEIVED",
            "authorization_id": auth_id,
            "transaction_id": tx_id,
            "payload": "User initiated intent creation",
        },
    )
    assert audit_res.status_code == 201, audit_res.text

    list_audit = client.get("/audit")
    assert list_audit.status_code == 200
    events = list_audit.json()
    assert len(events) == 1
    assert events[0]["trace_id"] == "trace-101"
