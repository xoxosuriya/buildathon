from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import schemas, database
from app.services import verification_engine

router = APIRouter(prefix="/verify", tags=["Verification"])


class VerificationRequestPayload(BaseModel):
    transaction_id: str


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
