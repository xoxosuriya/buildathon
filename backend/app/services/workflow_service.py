import json
import uuid
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app import models, crud, schemas
from app import schemas_workflow


def generate_proposal_snapshot(
    db: Session, req: schemas_workflow.ProposalGenerateRequest
) -> schemas_workflow.ProposalSnapshot:
    # 1. Fetch Intent
    db_intent = (
        db.query(models.Intent)
        .filter(models.Intent.id == req.intent_id)
        .first()
    )
    if not db_intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found"
        )

    # Validate quantity constraints
    if req.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested quantity must be greater than zero",
        )

    if req.quantity > db_intent.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested quantity ({req.quantity}) exceeds user's intended quantity limit ({db_intent.quantity})",
        )

    # 2. Fetch Product & validate active status
    db_product = (
        db.query(models.Product)
        .filter(models.Product.id == req.product_id)
        .first()
    )
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    if not db_product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is inactive and cannot be proposed",
        )

    if not db_product.merchant or db_product.merchant.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Merchant is inactive or unavailable",
        )

    # 3. Fetch authoritative MerchantState for current price
    effective_ts = func.coalesce(
        models.MerchantState.last_verified_at, models.MerchantState.created_at
    )
    db_state = (
        db.query(models.MerchantState)
        .filter(models.MerchantState.product_id == req.product_id)
        .order_by(effective_ts.desc(), models.MerchantState.id.desc())
        .first()
    )
    if not db_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MerchantState not found for product",
        )

    if db_state.product_id != db_product.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MerchantState product_id does not match requested Product id",
        )

    if db_state.merchant_id != db_product.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MerchantState merchant_id does not match Product merchant_id",
        )

    if not db_state.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is currently unavailable from merchant",
        )

    if req.quantity > db_state.inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested quantity ({req.quantity}) exceeds available merchant inventory ({db_state.inventory})",
        )

    # 4. Derive authoritative price from MerchantState.price & calculate total proposed amount using Decimal
    authoritative_price = db_state.price
    total_proposed_amount = Decimal(str(authoritative_price)) * Decimal(str(req.quantity))
    intent_max_amount = Decimal(str(db_intent.max_amount))

    if total_proposed_amount > intent_max_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total proposed amount ({total_proposed_amount}) exceeds user's maximum authorized limit ({intent_max_amount})",
        )

    proposal_id = f"PROP-{uuid.uuid4()}"
    now_utc = datetime.now(timezone.utc)

    # 5. Build immutable ProposalSnapshot
    snapshot = schemas_workflow.ProposalSnapshot(
        proposal_id=proposal_id,
        intent_id=db_intent.id,
        user_id=db_intent.user_id,
        agent_id=db_intent.agent_id,
        merchant_id=db_product.merchant_id,
        product_id=db_product.id,
        quantity=req.quantity,
        proposed_price=authoritative_price,
        currency="INR",
        add_ons=req.add_ons or "none",
        created_at=now_utc,
    )

    # 6. Store immutable proposal snapshot in append-only AuditEvent payload
    crud.create_audit_event(
        db=db,
        event=schemas.AuditEventCreate(
            trace_id=db_intent.id,
            event_type="PROPOSAL_GENERATED",
            authorization_id=None,
            transaction_id=None,
            payload=snapshot.model_dump_json(),
        ),
    )

    # 7. Update Intent status
    db_intent.status = "PROPOSED"
    db.commit()
    db.refresh(db_intent)

    return snapshot


def process_user_decision(
    db: Session, req: schemas_workflow.ProposalDecisionRequest
) -> Optional[models.Authorization]:
    # Validate expiry input
    if req.expiry_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry hours must be greater than zero",
        )

    decision_clean = req.decision.strip().upper()
    if decision_clean not in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'APPROVED' or 'REJECTED'",
        )

    # 1. Fetch Intent
    db_intent = crud.get_intent(db=db, intent_id=req.intent_id)
    if not db_intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found"
        )

    # Part 6: If Intent has already been finalized as APPROVED or REJECTED, reject any decision
    if db_intent.status in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Intent has already been finalized as {db_intent.status}. No further proposal decisions permitted.",
        )

    # 2. Query trace audit events to verify single-use state machine integrity
    audit_events = (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.trace_id == req.intent_id)
        .order_by(models.AuditEvent.timestamp.asc())
        .all()
    )

    # Find PROPOSAL_GENERATED payload matching proposal_id
    generated_payload_str = None
    for ev in audit_events:
        if ev.event_type == "PROPOSAL_GENERATED" and ev.payload:
            try:
                data = json.loads(ev.payload)
                if data.get("proposal_id") == req.proposal_id:
                    if data.get("intent_id") != req.intent_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Proposal ID does not belong to the specified intent",
                        )
                    generated_payload_str = ev.payload
                    break
            except json.JSONDecodeError:
                continue

    if not generated_payload_str:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal ID not found in audit trail for this intent",
        )

    # Check if proposal has ALREADY been approved or rejected
    for ev in audit_events:
        if ev.event_type in ("PROPOSAL_APPROVED", "PROPOSAL_REJECTED") and ev.payload:
            try:
                data = json.loads(ev.payload)
                if data.get("proposal_id") == req.proposal_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Proposal state decision is single-use and has already been finalized as {ev.event_type}",
                    )
            except json.JSONDecodeError:
                continue

    if decision_clean == "REJECTED":
        # Log REJECTED event and set intent status
        db_intent.status = "REJECTED"
        crud.create_audit_event(
            db=db,
            event=schemas.AuditEventCreate(
                trace_id=req.intent_id,
                event_type="PROPOSAL_REJECTED",
                authorization_id=None,
                transaction_id=None,
                payload=json.dumps({"proposal_id": req.proposal_id, "reason": "User rejected proposal"}),
            ),
        )
        db.commit()
        return None

    elif decision_clean == "APPROVED":
        # Parse stored immutable snapshot from AuditEvent payload
        snapshot_dict = json.loads(generated_payload_str)
        snapshot = schemas_workflow.ProposalSnapshot(**snapshot_dict)

        # Calculate explicit expiry
        now_utc = datetime.now(timezone.utc)
        expiry_time = now_utc + timedelta(hours=req.expiry_hours)

        # Calculate total authorized max_amount = unit_price * quantity using Decimal arithmetic
        total_auth_max_amount = Decimal(str(snapshot.proposed_price)) * Decimal(str(snapshot.quantity))

        # Create Authorization faithfully matching approved proposal snapshot values (Price Freeze!)
        auth_create = schemas.AuthorizationCreate(
            intent_id=snapshot.intent_id,
            user_id=snapshot.user_id,
            agent_id=snapshot.agent_id,
            merchant_id=snapshot.merchant_id,
            product_id=snapshot.product_id,
            action=db_intent.action,
            quantity=snapshot.quantity,
            max_amount=total_auth_max_amount,  # unit_price * quantity
            currency=snapshot.currency,
            allowed_add_ons=snapshot.add_ons,
            expiry_time=expiry_time,
            confirmation_required=True,
            status="ACTIVE",
        )
        try:
            db_auth = crud.create_authorization(db=db, auth=auth_create)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An Authorization contract already exists for this Intent",
            )

        # Update Intent status
        db_intent.status = "APPROVED"

        # Log PROPOSAL_APPROVED and AUTHORIZATION_CREATED
        crud.create_audit_event(
            db=db,
            event=schemas.AuditEventCreate(
                trace_id=req.intent_id,
                event_type="PROPOSAL_APPROVED",
                authorization_id=db_auth.id,
                transaction_id=None,
                payload=json.dumps({"proposal_id": req.proposal_id, "authorization_id": db_auth.id}),
            ),
        )
        crud.create_audit_event(
            db=db,
            event=schemas.AuditEventCreate(
                trace_id=req.intent_id,
                event_type="AUTHORIZATION_CREATED",
                authorization_id=db_auth.id,
                transaction_id=None,
                payload=json.dumps({
                    "authorization_id": db_auth.id,
                    "max_amount": str(db_auth.max_amount),
                    "product_id": db_auth.product_id,
                }),
            ),
        )

        db.commit()
        db.refresh(db_auth)
        return db_auth

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'APPROVED' or 'REJECTED'",
        )


def get_workflow_status(
    db: Session, intent_id: str
) -> schemas_workflow.WorkflowStatusResponse:
    db_intent = crud.get_intent(db=db, intent_id=intent_id)
    if not db_intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found"
        )

    # Fetch audit events
    audit_models = (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.trace_id == intent_id)
        .order_by(models.AuditEvent.timestamp.asc())
        .all()
    )
    audit_responses = [schemas.AuditEventResponse.model_validate(e) for e in audit_models]

    # Find proposal snapshot if available
    proposal_snap = None
    for ev in audit_models:
        if ev.event_type == "PROPOSAL_GENERATED" and ev.payload:
            try:
                data = json.loads(ev.payload)
                proposal_snap = schemas_workflow.ProposalSnapshot(**data)
            except json.JSONDecodeError:
                pass

    # Find authorization if created
    db_auth = (
        db.query(models.Authorization)
        .filter(models.Authorization.intent_id == intent_id)
        .first()
    )
    auth_resp = schemas.AuthorizationResponse.model_validate(db_auth) if db_auth else None

    return schemas_workflow.WorkflowStatusResponse(
        intent=schemas.IntentResponse.model_validate(db_intent),
        status=db_intent.status,
        proposal_snapshot=proposal_snap,
        authorization=auth_resp,
        audit_events=audit_responses,
    )
