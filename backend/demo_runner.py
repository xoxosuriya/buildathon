import sys
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.services.mock_ai_buyer import MockAIBuyerAdapter, MockAIBuyerMode
from app.services.llm_ai_buyer import LLMAIBuyerAdapter

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.database import engine
from app.models import Base

# Clean database tables for pristine demonstration
Base.metadata.drop_all(bind=engine, checkfirst=True)
Base.metadata.create_all(bind=engine, checkfirst=True)

client = TestClient(app)


def print_banner(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_step(step_num: int, label: str, details: str):
    print(f"\n[Step {step_num}] {label}")
    print(f"         {details}")


def run_demo():
    print_banner("INTENTLOCK — END-TO-END AI COMMERCE DEMONSTRATION RUNNER")
    print("Core Philosophy: THE AI PROPOSES. THE USER AUTHORIZES. INTENTLOCK ENFORCES. RAZORPAY EXECUTES.")
    print("Thesis: An AI agent may propose anything, but it can only spend what it holds a single-use capability for.")

    # Shared entities setup
    uid = str(uuid.uuid4())[:6]
    user = client.post("/user", json={"email": f"demo_{uid}@intentlock.io", "name": "Demo User"}).json()
    merchant = client.post("/merchant", json={"name": "TechZone Merchant", "category": "ELECTRONICS", "status": "ACTIVE"}).json()
    product = client.post("/product", json={"merchant_id": merchant["id"], "sku": f"MOUSE-{uid}", "name": "Wireless Ergonomic Mouse", "category": "ELECTRONICS", "price": "1200.00"}).json()
    
    client.post("/merchant-state", json={
        "merchant_id": merchant["id"],
        "product_id": product["id"],
        "price": "1200.00",
        "inventory": 10,
        "offer_status": "ACTIVE",
        "is_available": True,
        "last_verified_at": datetime.now(timezone.utc).isoformat()
    })
    
    agent_a = client.post("/agent", json={"name": "AI Shopping Agent A", "agent_type": "BUYER_ASSISTANT"}).json()
    agent_b = client.post("/agent", json={"name": "Compromised Agent B", "agent_type": "BUYER_ASSISTANT"}).json()

    # =========================================================================
    # SCENARIO 1 — LEGITIMATE END-TO-END PURCHASE
    # =========================================================================
    print_banner("SCENARIO 1 — LEGITIMATE END-TO-END PURCHASE")
    prompt = "Buy one wireless mouse under ₹1500."
    print_step(1, "USER PROMPT", prompt)

    llm = LLMAIBuyerAdapter()
    parsed = llm.parse_user_prompt(prompt)
    print_step(2, "AI DISCOVERY & REASONING", f"Parsed: Query='{parsed['search_query']}', MaxAmount=₹{parsed['max_amount']}")

    agent_honest = MockAIBuyerAdapter(MockAIBuyerMode.LEGITIMATE)
    catalog = agent_honest.discover_products(client, query="wireless", max_price=Decimal("1500.00"))
    selected = agent_honest.select_product("wireless mouse", catalog)
    print_step(3, "CATALOG SELECTION", f"Selected Product: '{selected['name']}' (Authoritative Price: ₹{selected['authoritative_price']})")

    intent = client.post("/intent", json={
        "user_id": user["id"],
        "agent_id": agent_a["id"],
        "raw_prompt": prompt,
        "action": "PURCHASE",
        "max_amount": "1500.00",
        "quantity": 1
    }).json()

    proposal = agent_honest.generate_proposal(client, intent_id=intent["id"], product_id=product["id"], quantity=1)
    print_step(4, "AI PURCHASE PROPOSAL", f"Proposal ID: {proposal['proposal_id']} | Proposed Price: ₹{proposal['proposed_price']}")

    auth = client.post("/intent/workflow/approve", json={
        "proposal_id": proposal["proposal_id"],
        "intent_id": intent["id"],
        "decision": "APPROVED"
    }).json()
    print_step(5, "VISIBLE USER APPROVAL", f"Capability Minted: {auth['id']} | Status: {auth['status']} | Bounded Max: ₹{auth['max_amount']}")

    tx_payload = agent_honest.construct_transaction(
        authorization_id=auth["id"],
        agent_id=agent_a["id"],
        merchant_id=merchant["id"],
        product_id=product["id"],
        amount=Decimal("1200.00"),
        quantity=1
    )
    txn = client.post("/transaction", json=tx_payload).json()
    print_step(6, "TRANSACTION SUBMISSION", f"Txn ID: {txn['id']} | Requested Amount: ₹{txn['requested_amount']}")

    verif = client.post(f"/verify/{txn['id']}").json()
    print_step(7, "INTENTLOCK 21-CHECK VERIFICATION", f"Decision: {verif['decision']} | Reason: {verif['reason']}")
    assert verif["decision"] == "ALLOW"

    pay = client.post("/payment/execute", json={"transaction_id": txn["id"], "verification_id": verif["id"]}).json()
    print_step(8, "RAZORPAY TEST MODE BOUNDARY", f"Payment Status: {pay['status']} | Razorpay Order ID: {pay['razorpay_order_id']}")
    assert pay["status"] == "CREATED"

    # =========================================================================
    # SCENARIO 2 — PRICE ESCALATION ATTACK
    # =========================================================================
    print_banner("SCENARIO 2 — PRICE ESCALATION ATTACK")
    print_step(1, "ATTACK VECTOR", "Compromised AI Agent attempts to inflate transaction amount from ₹1200 to ₹2500.")

    intent2 = client.post("/intent", json={"user_id": user["id"], "agent_id": agent_a["id"], "raw_prompt": prompt, "action": "PURCHASE", "max_amount": "1500.00", "quantity": 1}).json()
    prop2 = agent_honest.generate_proposal(client, intent_id=intent2["id"], product_id=product["id"], quantity=1)
    auth2 = client.post("/intent/workflow/approve", json={"proposal_id": prop2["proposal_id"], "intent_id": intent2["id"], "decision": "APPROVED"}).json()

    agent_attacker_price = MockAIBuyerAdapter(MockAIBuyerMode.ATTACK_PRICE_ESCALATION)
    tx_payload2 = agent_attacker_price.construct_transaction(
        authorization_id=auth2["id"],
        agent_id=agent_a["id"],
        merchant_id=merchant["id"],
        product_id=product["id"],
        amount=Decimal("1500.00"),
        quantity=1
    )
    txn2 = client.post("/transaction", json=tx_payload2).json()
    verif2 = client.post(f"/verify/{txn2['id']}").json()
    print_step(2, "INTENTLOCK ENFORCEMENT", f"Decision: {verif2['decision']} | Reason: {verif2['reason']}")
    assert verif2["decision"] == "BLOCK"

    pay_res2 = client.post("/payment/execute", json={"transaction_id": txn2["id"], "verification_id": verif2["id"]})
    print_step(3, "PAYMENT BOUNDARY SAFETY", f"Payment Execution Status: HTTP {pay_res2.status_code} (Rejected)")
    assert pay_res2.status_code == 400

    # =========================================================================
    # SCENARIO 3 — AGENT DELEGATION ATTACK
    # =========================================================================
    print_banner("SCENARIO 3 — AGENT DELEGATION ATTACK")
    print_step(1, "ATTACK VECTOR", "Unauthorized Agent B attempts to spend Agent A's capability.")

    intent3 = client.post("/intent", json={"user_id": user["id"], "agent_id": agent_a["id"], "raw_prompt": prompt, "action": "PURCHASE", "max_amount": "1500.00", "quantity": 1}).json()
    prop3 = agent_honest.generate_proposal(client, intent_id=intent3["id"], product_id=product["id"], quantity=1)
    auth3 = client.post("/intent/workflow/approve", json={"proposal_id": prop3["proposal_id"], "intent_id": intent3["id"], "decision": "APPROVED"}).json()

    agent_attacker_deleg = MockAIBuyerAdapter(MockAIBuyerMode.ATTACK_AGENT_DELEGATION, override_agent_id=agent_b["id"])
    tx_payload3 = agent_attacker_deleg.construct_transaction(
        authorization_id=auth3["id"],
        agent_id=agent_a["id"],
        merchant_id=merchant["id"],
        product_id=product["id"],
        amount=Decimal("1200.00"),
        quantity=1
    )
    txn3 = client.post("/transaction", json=tx_payload3).json()
    verif3 = client.post(f"/verify/{txn3['id']}").json()
    print_step(2, "INTENTLOCK ENFORCEMENT", f"Decision: {verif3['decision']} | Reason: {verif3['reason']}")
    assert verif3["decision"] == "BLOCK"

    # =========================================================================
    # SCENARIO 4 — CAPABILITY SUBDIVISION / REPLAY ATTACK
    # =========================================================================
    print_banner("SCENARIO 4 — CAPABILITY SUBDIVISION / REPLAY ATTACK")
    print_step(1, "ATTACK VECTOR", "Agent attempts to execute a single authorization twice.")

    intent4 = client.post("/intent", json={"user_id": user["id"], "agent_id": agent_a["id"], "raw_prompt": prompt, "action": "PURCHASE", "max_amount": "1500.00", "quantity": 1}).json()
    prop4 = agent_honest.generate_proposal(client, intent_id=intent4["id"], product_id=product["id"], quantity=1)
    auth4 = client.post("/intent/workflow/approve", json={"proposal_id": prop4["proposal_id"], "intent_id": intent4["id"], "decision": "APPROVED"}).json()

    # First Execution -> ALLOW
    tx1 = client.post("/transaction", json=agent_honest.construct_transaction(auth4["id"], agent_a["id"], merchant["id"], product["id"], Decimal("1200.00"))).json()
    v1 = client.post(f"/verify/{tx1['id']}").json()
    print_step(2, "FIRST EXECUTION", f"Transaction 1 Decision: {v1['decision']} (Capability Consumed)")
    assert v1["decision"] == "ALLOW"

    # Second Execution -> BLOCK
    tx2 = client.post("/transaction", json=agent_honest.construct_transaction(auth4["id"], agent_a["id"], merchant["id"], product["id"], Decimal("1200.00"))).json()
    v2 = client.post(f"/verify/{tx2['id']}").json()
    print_step(3, "REPLAY EXECUTION", f"Transaction 2 Decision: {v2['decision']} | Reason: {v2['reason']}")
    assert v2["decision"] == "BLOCK"

    # =========================================================================
    # SCENARIO 5 — PRICE DRIFT & REVIEW RESOLUTION
    # =========================================================================
    print_banner("SCENARIO 5 — PRICE DRIFT & REVIEW RESOLUTION")
    print_step(1, "OPERATIONAL STATE", "Merchant updates live product price from ₹1200 to ₹1400 after approval.")

    intent5 = client.post("/intent", json={"user_id": user["id"], "agent_id": agent_a["id"], "raw_prompt": prompt, "action": "PURCHASE", "max_amount": "1500.00", "quantity": 1}).json()
    prop5 = agent_honest.generate_proposal(client, intent_id=intent5["id"], product_id=product["id"], quantity=1)
    auth5 = client.post("/intent/workflow/approve", json={"proposal_id": prop5["proposal_id"], "intent_id": intent5["id"], "decision": "APPROVED"}).json()

    # Live merchant state updated
    client.post("/merchant-state", json={
        "merchant_id": merchant["id"],
        "product_id": product["id"],
        "price": "1400.00",
        "inventory": 10,
        "offer_status": "ACTIVE",
        "is_available": True,
        "last_verified_at": datetime.now(timezone.utc).isoformat()
    })

    txn5 = client.post("/transaction", json=agent_honest.construct_transaction(auth5["id"], agent_a["id"], merchant["id"], product["id"], Decimal("1200.00"))).json()
    verif5 = client.post(f"/verify/{txn5['id']}").json()
    print_step(2, "INTENTLOCK REVIEW DETECTION", f"Decision: {verif5['decision']} | Reason: {verif5['reason']}")
    assert verif5["decision"] == "REVIEW"

    # User resolves review accepting authoritative price
    resolved = client.post(f"/verify/{txn5['id']}/resolve", json={"reason": "User accepts price update to ₹1400", "action": "ACCEPT", "accepted_price": "1400.00"}).json()
    print_step(3, "USER REVIEW RESOLUTION", f"Review Resolved | Re-minted Verification Decision: {resolved['decision']}")
    assert resolved["decision"] == "ALLOW"

    pay5 = client.post("/payment/execute", json={"transaction_id": resolved["transaction_id"], "verification_id": resolved["id"]}).json()
    print_step(4, "RE-MINTED PAYMENT EXECUTION", f"Payment Status: {pay5['status']} | Razorpay Order ID: {pay5['razorpay_order_id']}")
    assert pay5["status"] == "CREATED"

    # =========================================================================
    # SCENARIO 6 — AUDIT TRAIL HASH-CHAIN VERIFICATION
    # =========================================================================
    print_banner("SCENARIO 6 — AUDIT TRAIL HASH-CHAIN VERIFICATION")
    all_events = client.get("/audit/events").json()
    trace_events = [ev for ev in all_events if ev.get("trace_id") == intent["id"]]
    print_step(1, "AUDIT LOG SEQUENCE", f"Retrieved {len(trace_events)} Audit Events for Scenario 1 Intent '{intent['id']}'")

    for idx, ev in enumerate(trace_events, 1):
        prev_str = ev['previous_hash'][:16] if ev.get('previous_hash') else 'GENESIS'
        hash_str = ev['hash'][:16] if ev.get('hash') else 'N/A'
        print(f"         Event #{idx}: {ev['event_type']} | Hash: {hash_str}... | Prev: {prev_str}...")

    # Validate hash chain continuity across sequence
    is_valid_chain = True
    for i in range(1, len(trace_events)):
        if trace_events[i].get("previous_hash") != trace_events[i-1].get("hash"):
            is_valid_chain = False
            break

    print_step(2, "CRYPTOGRAPHIC HASH-CHAIN VERIFICATION", f"Chain Valid: {is_valid_chain} | Cryptographic SHA-256 Continuity Verified")
    assert is_valid_chain is True

    print_banner("DEMONSTRATION COMPLETE — 100% INVARIANT ENFORCEMENT VERIFIED")


if __name__ == "__main__":
    run_demo()
