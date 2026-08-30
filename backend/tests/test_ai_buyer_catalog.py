import uuid
from decimal import Decimal
from datetime import datetime, timezone
import pytest

from app.services.mock_ai_buyer import MockAIBuyerAdapter, MockAIBuyerMode
from app.services.llm_ai_buyer import LLMAIBuyerAdapter


def helper_setup_catalog_entities(client):
    uid = str(uuid.uuid4())[:6]
    u = client.post("/user", json={"email": f"cat_{uid}@test.org", "name": "Catalog User"}).json()
    m = client.post("/merchant", json={"name": f"Merch_{uid}", "category": "ELECTRONICS", "status": "ACTIVE"}).json()
    p = client.post("/product", json={"merchant_id": m["id"], "sku": f"SKU-{uid}", "name": "Smart Headphones", "category": "ELECTRONICS", "price": "100.00"}).json()
    
    client.post("/merchant-state", json={
        "merchant_id": m["id"],
        "product_id": p["id"],
        "price": "100.00",
        "inventory": 20,
        "offer_status": "ACTIVE",
        "is_available": True,
        "last_verified_at": datetime.now(timezone.utc).isoformat()
    })
    
    a_a = client.post("/agent", json={"name": "Agent A", "agent_type": "BUYER"}).json()
    a_b = client.post("/agent", json={"name": "Agent B", "agent_type": "BUYER"}).json()
    
    return {
        "user": u,
        "merchant": m,
        "product": p,
        "agent_a": a_a,
        "agent_b": a_b
    }


def test_catalog_product_search_and_filtering(client):
    e = helper_setup_catalog_entities(client)
    res = client.get("/catalog/products?q=Headphones").json()
    assert len(res) >= 1
    assert res[0]["id"] == e["product"]["id"]
    assert Decimal(res[0]["authoritative_price"]) == Decimal("100.00")


def test_catalog_product_detail_authoritative_merchant_state(client):
    e = helper_setup_catalog_entities(client)
    res = client.get(f"/catalog/products/{e['product']['id']}").json()
    assert res["id"] == e["product"]["id"]
    assert res["merchant_id"] == e["merchant"]["id"]
    assert res["is_available"] is True


def test_catalog_merchant_listing(client):
    e = helper_setup_catalog_entities(client)
    res = client.get("/catalog/merchants?status_filter=ACTIVE").json()
    assert any(m["id"] == e["merchant"]["id"] for m in res)


def test_mock_ai_buyer_legitimate_flow(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    tx_payload = honest_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))
    txn = client.post("/transaction", json=tx_payload).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "ALLOW"
    
    pay = client.post("/payment/execute", json={"transaction_id": txn["id"], "verification_id": verif["id"]}).json()
    assert pay["status"] == "CREATED"


def test_mock_ai_buyer_price_escalation_attack_blocks(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    attacker_agent = MockAIBuyerAdapter(MockAIBuyerMode.ATTACK_PRICE_ESCALATION)
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    tx_payload = attacker_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))
    txn = client.post("/transaction", json=tx_payload).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "BLOCK"


def test_mock_ai_buyer_product_substitution_attack_blocks(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    attacker_agent = MockAIBuyerAdapter(MockAIBuyerMode.ATTACK_PRODUCT_SUBSTITUTION)
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    tx_payload = attacker_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))
    txn = client.post("/transaction", json=tx_payload)
    # Either returns 400 DB error or verification BLOCK
    if txn.status_code == 201:
        v = client.post(f"/verify/{txn.json()['id']}").json()
        assert v["decision"] == "BLOCK"
    else:
        assert txn.status_code == 400


def test_mock_ai_buyer_merchant_substitution_attack_blocks(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    attacker_agent = MockAIBuyerAdapter(MockAIBuyerMode.ATTACK_MERCHANT_SUBSTITUTION)
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    tx_payload = attacker_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))
    txn = client.post("/transaction", json=tx_payload)
    if txn.status_code == 201:
        v = client.post(f"/verify/{txn.json()['id']}").json()
        assert v["decision"] == "BLOCK"
    else:
        assert txn.status_code == 400


def test_mock_ai_buyer_agent_delegation_attack_blocks(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    attacker_agent = MockAIBuyerAdapter(MockAIBuyerMode.ATTACK_AGENT_DELEGATION, override_agent_id=e["agent_b"]["id"])
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    tx_payload = attacker_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))
    txn = client.post("/transaction", json=tx_payload).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "BLOCK"


def test_mock_ai_buyer_subdivision_replay_attack_blocks(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    tx1 = client.post("/transaction", json=honest_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))).json()
    v1 = client.post(f"/verify/{tx1['id']}").json()
    assert v1["decision"] == "ALLOW"
    
    tx2 = client.post("/transaction", json=honest_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))).json()
    v2 = client.post(f"/verify/{tx2['id']}").json()
    assert v2["decision"] == "BLOCK"


def test_mock_ai_buyer_price_drift_review_resolution(client):
    e = helper_setup_catalog_entities(client)
    honest_agent = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    
    intent = client.post("/intent", json={"user_id": e["user"]["id"], "agent_id": e["agent_a"]["id"], "raw_prompt": "Buy Headphones", "action": "PURCHASE", "max_amount": "150.00", "quantity": 1}).json()
    prop = honest_agent.generate_proposal(client, intent_id=intent["id"], product_id=e["product"]["id"], quantity=1)
    auth = client.post("/intent/workflow/approve", json={"proposal_id": prop["proposal_id"], "intent_id": intent["id"], "decision": "APPROVED"}).json()
    
    # Merchant updates price to 120.00
    client.post("/merchant-state", json={
        "merchant_id": e["merchant"]["id"],
        "product_id": e["product"]["id"],
        "price": "120.00",
        "inventory": 20,
        "offer_status": "ACTIVE",
        "is_available": True,
        "last_verified_at": datetime.now(timezone.utc).isoformat()
    })
    
    txn = client.post("/transaction", json=honest_agent.construct_transaction(auth["id"], e["agent_a"]["id"], e["merchant"]["id"], e["product"]["id"], Decimal("100.00"))).json()
    verif = client.post(f"/verify/{txn['id']}").json()
    assert verif["decision"] == "REVIEW"
    
    resolved = client.post(f"/verify/{txn['id']}/resolve", json={"reason": "User accepts price update", "action": "ACCEPT", "accepted_price": "120.00"}).json()
    assert resolved["decision"] == "ALLOW"


def test_llm_ai_buyer_adapter_parsing_and_untrusted_flow(client):
    llm = LLMAIBuyerAdapter()
    parsed = llm.parse_user_prompt("Buy 2 gaming headsets under ₹3000")
    assert parsed["quantity"] == 2
    assert parsed["max_amount"] == Decimal("3000")
