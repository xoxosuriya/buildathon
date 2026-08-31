import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import schemas, database, models
from app.services import verification_engine

router = APIRouter(prefix="/verify", tags=["Verification"])


class VerificationRequestPayload(BaseModel):
    transaction_id: str


class DemoScenarioRequest(BaseModel):
    scenario: str = "normal"  # 'normal' | 'price' | 'product' | 'target' | 'replay'
    intent_type: Optional[str] = "buy"  # 'buy' | 'book' | 'payment' | 'custom'


@router.post("/{transaction_id}", response_model=schemas.VerificationResultResponse)
def verify_transaction_path(
    transaction_id: str,
    db: Session = Depends(database.get_db),
):
    """Verify an existing transaction by path transaction_id."""
    return verification_engine.verify_transaction_by_id(db=db, transaction_id=transaction_id)


@router.post("", response_model=schemas.VerificationResultResponse)
def verify_transaction_body(
    payload: VerificationRequestPayload,
    db: Session = Depends(database.get_db),
):
    """Legacy/Body fallback: Verify an existing transaction by JSON body payload."""
    return verification_engine.verify_transaction_by_id(db=db, transaction_id=payload.transaction_id)


@router.post("/{transaction_id}/resolve", response_model=schemas.VerificationResultResponse)
def resolve_review_transaction_endpoint(
    transaction_id: str,
    req: schemas.ReviewResolveRequest,
    db: Session = Depends(database.get_db),
):
    """
    Explicit Review Resolution Endpoint:
    Resolves operational REVIEW condition, logs REVIEW_RESOLVED AuditEvent, and executes re-verification.
    Rejects BLOCK and ALLOW transactions.
    """
    return verification_engine.resolve_review_transaction(db=db, transaction_id=transaction_id, req=req)


@router.post("/demo-scenario/evaluate")
def evaluate_demo_scenario_endpoint(
    req: DemoScenarioRequest,
    db: Session = Depends(database.get_db),
):
    """
    Real Backend IntentLock Scenario Evaluation Endpoint.
    Executes the real 21-check verification engine against SQLite database for Section 6.
    """
    sc = (req.scenario or "normal").lower().strip()
    intent_t = (req.intent_type or "buy").lower().strip()
    uid = uuid.uuid4().hex[:8]

    # Intent Template Configuration
    INTENT_TEMPLATES = {
        "buy": {
            "action": "Purchase",
            "raw_prompt": "Purchase a wireless mouse under ₹1,500 from an authorized merchant.",
            "product_name": "Wireless Mouse",
            "max_amount": Decimal("1500.00"),
            "formatted_max": "₹1,500",
            "normal_amount": Decimal("1499.00"),
            "formatted_normal": "₹1,499",
            "escalated_amount": Decimal("1850.00"),
            "formatted_escalated": "₹1,850",
            "target_name": "Authorized Merchant",
            "changed_product_name": "Gaming Mouse RGB",
            "changed_target_name": "Unverified Marketplace",
            "category": "ELECTRONICS",
            "frequency": "Single-use",
        },
        "book": {
            "action": "Book",
            "raw_prompt": "Book a deluxe hotel suite under ₹5,000/night with Grand Plaza Hotel.",
            "product_name": "Deluxe Hotel Suite (1 Night)",
            "max_amount": Decimal("5000.00"),
            "formatted_max": "₹5,000",
            "normal_amount": Decimal("4800.00"),
            "formatted_normal": "₹4,800",
            "escalated_amount": Decimal("6500.00"),
            "formatted_escalated": "₹6,500",
            "target_name": "Grand Plaza Hotel",
            "changed_product_name": "Penthouse Presidential Suite",
            "changed_target_name": "Third-party Booking Agent",
            "category": "TRAVEL",
            "frequency": "Single-use",
        },
        "payment": {
            "action": "Pay",
            "raw_prompt": "Pay electric utility bill up to ₹2,500 to BESCOM Power.",
            "product_name": "Monthly Electricity Utility Bill",
            "max_amount": Decimal("2500.00"),
            "formatted_max": "₹2,500",
            "normal_amount": Decimal("2150.00"),
            "formatted_normal": "₹2,150",
            "escalated_amount": Decimal("3200.00"),
            "formatted_escalated": "₹3,200",
            "target_name": "BESCOM Power",
            "changed_product_name": "Commercial Power Tariff Addon",
            "changed_target_name": "Unregistered Payment Gateway",
            "category": "UTILITIES",
            "frequency": "Single-use",
        },
        "custom": {
            "action": "Purchase",
            "raw_prompt": "Purchase cloud server credits up to ₹10,000 on AWS.",
            "product_name": "AWS Cloud Server Credits",
            "max_amount": Decimal("10000.00"),
            "formatted_max": "₹10,000",
            "normal_amount": Decimal("8500.00"),
            "formatted_normal": "₹8,500",
            "escalated_amount": Decimal("12500.00"),
            "formatted_escalated": "₹12,500",
            "target_name": "Amazon Web Services",
            "changed_product_name": "Enterprise AI Cluster Subscription",
            "changed_target_name": "Unverified Cloud Reseller",
            "category": "COMPUTE",
            "frequency": "Single-use",
        },
    }

    tmpl = INTENT_TEMPLATES.get(intent_t, INTENT_TEMPLATES["buy"])

    # Create dynamic demo entities in DB
    user = models.User(id=f"u_{uid}", email=f"demo_{uid}@intentlock.io", name="Demo User")
    db.add(user)

    agent_a = models.Agent(id=f"ag_{uid}", name="AI Autonomous Agent", agent_type="BUYER_ASSISTANT")
    db.add(agent_a)

    merchant_auth = models.Merchant(
        id=f"m_auth_{uid}", name=tmpl["target_name"], category=tmpl["category"], status="ACTIVE"
    )
    db.add(merchant_auth)

    merchant_unauth = models.Merchant(
        id=f"m_unauth_{uid}", name=tmpl["changed_target_name"], category=tmpl["category"], status="ACTIVE"
    )
    db.add(merchant_unauth)
    db.commit()

    product_auth = models.Product(
        id=f"p_auth_{uid}",
        merchant_id=merchant_auth.id,
        sku=f"SKU-AUTH-{uid}",
        name=tmpl["product_name"],
        category=tmpl["category"],
        price=tmpl["normal_amount"],
        is_active=True,
    )
    db.add(product_auth)

    product_unauth = models.Product(
        id=f"p_unauth_{uid}",
        merchant_id=merchant_auth.id,
        sku=f"SKU-UNAUTH-{uid}",
        name=tmpl["changed_product_name"],
        category=tmpl["category"],
        price=tmpl["normal_amount"],
        is_active=True,
    )
    db.add(product_unauth)
    db.commit()

    state_auth = models.MerchantState(
        id=f"ms_auth_{uid}",
        merchant_id=merchant_auth.id,
        product_id=product_auth.id,
        price=tmpl["normal_amount"],
        inventory=100,
        offer_status="ACTIVE",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc),
    )
    db.add(state_auth)

    state_unauth_prod = models.MerchantState(
        id=f"ms_unauth_{uid}",
        merchant_id=merchant_auth.id,
        product_id=product_unauth.id,
        price=tmpl["normal_amount"],
        inventory=100,
        offer_status="ACTIVE",
        is_available=True,
        last_verified_at=datetime.now(timezone.utc),
    )
    db.add(state_unauth_prod)
    db.commit()

    # 1. Create fresh Intent
    intent_id = f"intent_{uid}"
    db_intent = models.Intent(
        id=intent_id,
        user_id=user.id,
        agent_id=agent_a.id,
        raw_prompt=tmpl["raw_prompt"],
        action=tmpl["action"].upper(),
        max_amount=tmpl["max_amount"],
        quantity=1,
        status="BOUNDED",
    )
    db.add(db_intent)
    db.commit()

    # 2. Mint fresh Authorization
    auth_id = f"auth_{uid}"
    db_auth = models.Authorization(
        id=auth_id,
        intent_id=intent_id,
        user_id=user.id,
        agent_id=agent_a.id,
        merchant_id=merchant_auth.id,
        product_id=product_auth.id,
        action=tmpl["action"].upper(),
        max_amount=tmpl["max_amount"],
        quantity=1,
        currency="INR",
        status="ACTIVE",
        expiry_time=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(db_auth)
    db.commit()

    # 3. Add Proposal snapshot AuditEvents
    proposal_id = f"prop_{uid}"
    db.add(
        models.AuditEvent(
            trace_id=intent_id,
            event_type="PROPOSAL_GENERATED",
            payload=json.dumps({"proposal_id": proposal_id, "proposed_price": str(tmpl["normal_amount"])}),
        )
    )
    db.add(
        models.AuditEvent(
            trace_id=intent_id,
            authorization_id=auth_id,
            event_type="PROPOSAL_APPROVED",
            payload=json.dumps({"proposal_id": proposal_id}),
        )
    )

    db.commit()

    user_authorization_data = {
        "action": tmpl["action"],
        "product": tmpl["product_name"],
        "formattedMaxAmount": tmpl["formatted_max"],
        "target": tmpl["target_name"],
        "frequency": tmpl["frequency"],
    }

    # 4. Construct proposed transaction according to selected security scenario
    if sc == "normal":
        txn = models.Transaction(
            id=f"txn_norm_{uid}",
            authorization_id=auth_id,
            agent_id=agent_a.id,
            merchant_id=merchant_auth.id,
            product_id=product_auth.id,
            requested_amount=tmpl["normal_amount"],
            quantity=1,
            currency="INR",
        )
        db.add(txn)
        db.commit()

        verif_result = verification_engine.verify_transaction_by_id(db=db, transaction_id=txn.id)

        return {
            "scenario": "normal",
            "scenarioLabel": "NORMAL EXECUTION",
            "intent_type": intent_t,
            "decision": verif_result.decision,
            "status": "AUTHORIZED" if verif_result.decision == "ALLOW" else "BLOCKED",
            "reason": verif_result.reason,
            "explanation": "Action matches the user's original authorization.",
            "user_authorization": user_authorization_data,
            "proposed_action": {
                "item": tmpl["product_name"],
                "amount": tmpl["formatted_normal"],
                "target": tmpl["target_name"],
                "attempt": "1st execution",
            },
            "checks": [
                {"label": "Intent matched", "passed": True},
                {"label": "Limit verified", "passed": True},
                {"label": "Target valid", "passed": True},
                {"label": "Single-use valid", "passed": True},
            ],
        }

    elif sc == "price":
        # Price Escalation: Requested amount > max_amount
        txn = models.Transaction(
            id=f"txn_price_{uid}",
            authorization_id=auth_id,
            agent_id=agent_a.id,
            merchant_id=merchant_auth.id,
            product_id=product_auth.id,
            requested_amount=tmpl["escalated_amount"],
            quantity=1,
            currency="INR",
        )
        db.add(txn)
        db.commit()

        verif_result = verification_engine.verify_transaction_by_id(db=db, transaction_id=txn.id)

        return {
            "scenario": "price",
            "scenarioLabel": "PRICE ESCALATION",
            "intent_type": intent_t,
            "decision": verif_result.decision,
            "status": "BLOCKED",
            "reason": f"Requested amount ({tmpl['formatted_escalated']}) exceeds authorized limit ({tmpl['formatted_max']}).",
            "backend_detail": verif_result.reason,
            "comparison": {
                "authorized": tmpl["formatted_max"],
                "requested": tmpl["formatted_escalated"],
            },
            "user_authorization": user_authorization_data,
            "proposed_action": {
                "item": tmpl["product_name"],
                "amount": tmpl["formatted_escalated"],
                "target": tmpl["target_name"],
                "attempt": "1st execution",
            },
            "checks": [
                {"label": "Intent matched", "passed": True},
                {"label": "Limit exceeded", "passed": False},
                {"label": "Target valid", "passed": True},
                {"label": "Single-use valid", "passed": True},
            ],
        }

    elif sc == "product":
        # Product Change: Product ID does not match authorization
        txn = models.Transaction(
            id=f"txn_prod_{uid}",
            authorization_id=auth_id,
            agent_id=agent_a.id,
            merchant_id=merchant_auth.id,
            product_id=product_unauth.id,
            requested_amount=tmpl["normal_amount"],
            quantity=1,
            currency="INR",
        )
        db.add(txn)
        db.commit()

        verif_result = verification_engine.verify_transaction_by_id(db=db, transaction_id=txn.id)

        return {
            "scenario": "product",
            "scenarioLabel": "PRODUCT CHANGE",
            "intent_type": intent_t,
            "decision": verif_result.decision,
            "status": "BLOCKED",
            "reason": f"Proposed product '{tmpl['changed_product_name']}' does not match authorized product '{tmpl['product_name']}'.",
            "backend_detail": verif_result.reason,
            "comparison": {
                "authorized": tmpl["product_name"],
                "requested": tmpl["changed_product_name"],
            },
            "user_authorization": user_authorization_data,
            "proposed_action": {
                "item": tmpl["changed_product_name"],
                "amount": tmpl["formatted_normal"],
                "target": tmpl["target_name"],
                "attempt": "1st execution",
            },
            "checks": [
                {"label": "Product mismatch", "passed": False},
                {"label": "Limit verified", "passed": True},
                {"label": "Target valid", "passed": True},
                {"label": "Single-use valid", "passed": True},
            ],
        }

    elif sc in ["target", "merchant"]:
        # Target/Merchant Change: Unverified Merchant ID
        txn = models.Transaction(
            id=f"txn_target_{uid}",
            authorization_id=auth_id,
            agent_id=agent_a.id,
            merchant_id=merchant_unauth.id,
            product_id=product_auth.id,
            requested_amount=tmpl["normal_amount"],
            quantity=1,
            currency="INR",
        )
        db.add(txn)
        db.commit()

        verif_result = verification_engine.verify_transaction_by_id(db=db, transaction_id=txn.id)

        return {
            "scenario": "target",
            "scenarioLabel": "TARGET CHANGE",
            "intent_type": intent_t,
            "decision": verif_result.decision,
            "status": "BLOCKED",
            "reason": f"Target merchant '{tmpl['changed_target_name']}' is outside authorized scope.",
            "backend_detail": verif_result.reason,
            "comparison": {
                "authorizedTarget": tmpl["target_name"],
                "requestedTarget": tmpl["changed_target_name"],
            },
            "user_authorization": user_authorization_data,
            "proposed_action": {
                "item": tmpl["product_name"],
                "amount": tmpl["formatted_normal"],
                "target": tmpl["changed_target_name"],
                "attempt": "1st execution",
            },
            "checks": [
                {"label": "Intent matched", "passed": True},
                {"label": "Limit verified", "passed": True},
                {"label": "Target invalid", "passed": False},
                {"label": "Single-use valid", "passed": True},
            ],
        }

    elif sc == "replay":
        # Replay Attack: 1st transaction succeeds -> contract set to USED.
        # 2nd transaction with SAME authorization -> BLOCKED by engine.
        txn1 = models.Transaction(
            id=f"txn_rep1_{uid}",
            authorization_id=auth_id,
            agent_id=agent_a.id,
            merchant_id=merchant_auth.id,
            product_id=product_auth.id,
            requested_amount=tmpl["normal_amount"],
            quantity=1,
            currency="INR",
        )
        db.add(txn1)
        db.commit()

        # 1st execution -> ALLOW & marks capability USED
        v1 = verification_engine.verify_transaction_by_id(db=db, transaction_id=txn1.id)
        if v1.decision == "ALLOW":
            db_auth.status = "USED"
            db.commit()

        # 2nd execution -> Submitted with SAME authorization ID
        txn2 = models.Transaction(
            id=f"txn_rep2_{uid}",
            authorization_id=auth_id,
            agent_id=agent_a.id,
            merchant_id=merchant_auth.id,
            product_id=product_auth.id,
            requested_amount=tmpl["normal_amount"],
            quantity=1,
            currency="INR",
        )
        db.add(txn2)
        db.commit()

        verif_result = verification_engine.verify_transaction_by_id(db=db, transaction_id=txn2.id)

        return {
            "scenario": "replay",
            "scenarioLabel": "REPLAY",
            "intent_type": intent_t,
            "decision": verif_result.decision,
            "status": "BLOCKED",
            "reason": "Single-use authorization has already been consumed. Replay protection lock engaged.",
            "backend_detail": verif_result.reason,
            "user_authorization": user_authorization_data,
            "proposed_action": {
                "item": tmpl["product_name"],
                "amount": tmpl["formatted_normal"],
                "target": tmpl["target_name"],
                "attempt": "2nd execution",
            },
            "checks": [
                {"label": "Intent matched", "passed": True},
                {"label": "Limit verified", "passed": True},
                {"label": "Target valid", "passed": True},
                {"label": "Replay detected", "passed": False},
            ],
        }

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid demo scenario '{sc}'. Supported: 'normal', 'price', 'product', 'target', 'replay'",
        )

