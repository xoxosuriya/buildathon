from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import schemas
from app import schemas_workflow
from app.database import get_db
from app.services import workflow_service

router = APIRouter(prefix="/intent/workflow", tags=["Workflow"])


@router.post(
    "/proposal",
    response_model=schemas_workflow.ProposalSnapshot,
    status_code=status.HTTP_201_CREATED,
)
def generate_proposal(
    req: schemas_workflow.ProposalGenerateRequest, db: Session = Depends(get_db)
):
    """Generate an immutable structured proposal snapshot using authoritative MerchantState price."""
    return workflow_service.generate_proposal_snapshot(db=db, req=req)


@router.post(
    "/approve",
    response_model=Optional[schemas.AuthorizationResponse],
    status_code=status.HTTP_200_OK,
)
def submit_decision(
    req: schemas_workflow.ProposalDecisionRequest, db: Session = Depends(get_db)
):
    """Process explicit user decision (APPROVED/REJECTED) using single-use state machine."""
    return workflow_service.process_user_decision(db=db, req=req)


@router.get(
    "/{intent_id}/status",
    response_model=schemas_workflow.WorkflowStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_status(intent_id: str, db: Session = Depends(get_db)):
    """Retrieve full traceable workflow history for an intent."""
    return workflow_service.get_workflow_status(db=db, intent_id=intent_id)
