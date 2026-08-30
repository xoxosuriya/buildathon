from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.post("", response_model=schemas.AuditEventResponse, status_code=status.HTTP_201_CREATED)
def create_audit_event(event: schemas.AuditEventCreate, db: Session = Depends(get_db)):
    """Append a new audit event to the log (Append-only)."""
    return crud.create_audit_event(db=db, event=event)


@router.get("", response_model=List[schemas.AuditEventResponse])
@router.get("/events", response_model=List[schemas.AuditEventResponse])
def read_audit_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve list of recorded audit events."""
    return crud.get_audit_events(db=db, skip=skip, limit=limit)


@router.get("/stats", response_model=schemas.DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Calculate dynamic dashboard statistics from real database rows."""
    from decimal import Decimal
    from app import models

    total_transactions = db.query(models.Transaction).count()
    allowed_count = (
        db.query(models.VerificationResult)
        .filter(models.VerificationResult.decision == "ALLOW")
        .count()
    )
    review_count = (
        db.query(models.VerificationResult)
        .filter(models.VerificationResult.decision == "REVIEW")
        .count()
    )
    blocked_count = (
        db.query(models.VerificationResult)
        .filter(models.VerificationResult.decision == "BLOCK")
        .count()
    )

    blocked_txns = (
        db.query(models.Transaction.requested_amount)
        .join(
            models.VerificationResult,
            models.Transaction.id == models.VerificationResult.transaction_id,
        )
        .filter(models.VerificationResult.decision == "BLOCK")
        .all()
    )
    total_amount_blocked = sum((t[0] for t in blocked_txns), Decimal("0.00"))

    active_agents = db.query(models.Agent).count()

    return schemas.DashboardStatsResponse(
        total_transactions=total_transactions,
        allowed_count=allowed_count,
        review_count=review_count,
        blocked_count=blocked_count,
        total_amount_blocked=total_amount_blocked,
        active_agents=active_agents,
    )


@router.get("/{event_id}", response_model=schemas.AuditEventResponse)
def read_audit_event(event_id: str, db: Session = Depends(get_db)):
    """Retrieve a single audit event by ID."""
    db_event = crud.get_audit_event(db=db, event_id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Audit event not found")
    return db_event
