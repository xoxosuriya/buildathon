import os
import json
import uuid
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import models, schemas


def execute_payment_service(
    db: Session, req: schemas.PaymentExecuteRequest
) -> models.PaymentOrder:
    # 1. Fetch Transaction
    db_txn = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == req.transaction_id)
        .first()
    )
    if not db_txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    # 2. Fetch authoritative VerificationResult
    db_verif = (
        db.query(models.VerificationResult)
        .filter(models.VerificationResult.transaction_id == req.transaction_id)
        .first()
    )
    if not db_verif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction has not undergone IntentLock verification. Payment rejected.",
        )

    # 3. Validate verification_id if provided
    if req.verification_id and req.verification_id != db_verif.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification ID mismatch: Provided verification_id '{req.verification_id}' does not match transaction's stored verification '{db_verif.id}'.",
        )

    # 4. STRICT SECURITY GATE: Only decision == 'ALLOW' can reach payment execution
    if db_verif.decision == "BLOCK":
        # Audit log rejected attempt
        db_audit = models.AuditEvent(
            id=models.generate_uuid(),
            trace_id=db_verif.authorization_id,
            event_type="PAYMENT_REJECTED",
            authorization_id=db_verif.authorization_id,
            transaction_id=db_txn.id,
            payload=json.dumps({
                "transaction_id": db_txn.id,
                "verification_id": db_verif.id,
                "decision": "BLOCK",
                "reason": db_verif.reason,
            }),
        )
        db.add(db_audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment execution rejected: Transaction decision is BLOCK. Reason: {db_verif.reason}",
        )

    if db_verif.decision == "REVIEW":
        db_audit = models.AuditEvent(
            id=models.generate_uuid(),
            trace_id=db_verif.authorization_id,
            event_type="PAYMENT_REJECTED",
            authorization_id=db_verif.authorization_id,
            transaction_id=db_txn.id,
            payload=json.dumps({
                "transaction_id": db_txn.id,
                "verification_id": db_verif.id,
                "decision": "REVIEW",
                "reason": "Transaction requires human review before payment execution",
            }),
        )
        db.add(db_audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment execution rejected: Transaction decision is REVIEW. Human resolution required before payment execution.",
        )

    if db_verif.decision != "ALLOW":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment execution rejected: Invalid verification decision '{db_verif.decision}'.",
        )

    # 5. PAYMENT IDEMPOTENCY: Check if PaymentOrder already exists
    existing_payment = (
        db.query(models.PaymentOrder)
        .filter(models.PaymentOrder.transaction_id == db_txn.id)
        .first()
    )
    if existing_payment:
        db_audit = models.AuditEvent(
            id=models.generate_uuid(),
            trace_id=db_verif.authorization_id,
            event_type="PAYMENT_REPEATED",
            authorization_id=db_verif.authorization_id,
            transaction_id=db_txn.id,
            payload=json.dumps({
                "payment_id": existing_payment.id,
                "razorpay_order_id": existing_payment.razorpay_order_id,
                "status": existing_payment.status,
                "note": "Idempotent payment request returned existing PaymentOrder",
            }),
        )
        db.add(db_audit)
        db.commit()
        return existing_payment

    # 6. RAZORPAY TEST MODE INTEGRATION & SECURITY BOUNDARY
    rzp_key_id = os.getenv("RAZORPAY_KEY_ID")
    rzp_key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    rzp_order_id = None

    if rzp_key_id and rzp_key_secret:
        # CASE 2: Credentials ARE configured -> Must attempt Razorpay Test Mode call and FAIL CLOSED on API error
        try:
            import razorpay
            client = razorpay.Client(auth=(rzp_key_id, rzp_key_secret))
            amount_paise = int(db_txn.requested_amount * Decimal("100"))
            order_data = {
                "amount": amount_paise,
                "currency": db_txn.currency,
                "receipt": f"rcpt_{db_txn.id[:8]}",
                "notes": {
                    "intentlock_verification_id": db_verif.id,
                    "authorization_id": db_verif.authorization_id,
                },
            }
            res = client.order.create(data=order_data)
            rzp_order_id = res.get("id")
            if not rzp_order_id:
                raise Exception("Razorpay API returned response without valid order ID")
        except Exception as exc:
            # DO NOT generate fake order ID when credentials are configured.
            # DO NOT create PaymentOrder. DO NOT create PAYMENT_EXECUTED.
            db_audit = models.AuditEvent(
                id=models.generate_uuid(),
                trace_id=db_verif.authorization_id,
                event_type="PAYMENT_FAILED",
                authorization_id=db_verif.authorization_id,
                transaction_id=db_txn.id,
                payload=json.dumps({
                    "transaction_id": db_txn.id,
                    "verification_id": db_verif.id,
                    "error": str(exc),
                    "note": "Razorpay payment gateway order creation failed for configured credentials",
                }),
            )
            db.add(db_audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Razorpay payment gateway order creation failed: {str(exc)}",
            )
    else:
        # CASE 1: Credentials NOT configured -> Offline prototype/demo fallback
        rzp_order_id = f"order_test_rzp_{uuid.uuid4().hex[:14]}"

    # 7. PERSIST PAYMENT ORDER & AUDIT EVENT ATOMICALLY
    db_payment = models.PaymentOrder(
        id=f"PAY-{uuid.uuid4()}",
        transaction_id=db_txn.id,
        verification_id=db_verif.id,
        authorization_id=db_verif.authorization_id,
        razorpay_order_id=rzp_order_id,
        amount=db_txn.requested_amount,
        currency=db_txn.currency,
        status="CREATED",
    )
    db.add(db_payment)

    db_audit = models.AuditEvent(
        id=models.generate_uuid(),
        trace_id=db_verif.authorization_id,
        event_type="PAYMENT_EXECUTED",
        authorization_id=db_verif.authorization_id,
        transaction_id=db_txn.id,
        payload=json.dumps({
            "payment_id": db_payment.id,
            "verification_id": db_verif.id,
            "razorpay_order_id": rzp_order_id,
            "amount": str(db_txn.requested_amount),
            "currency": db_txn.currency,
            "status": "CREATED",
        }),
    )
    db.add(db_audit)

    try:
        db.commit()
        db.refresh(db_payment)
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(models.PaymentOrder)
            .filter(models.PaymentOrder.transaction_id == db_txn.id)
            .first()
        )
        if existing:
            return existing
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment execution encountered database conflict",
        )

    return db_payment
