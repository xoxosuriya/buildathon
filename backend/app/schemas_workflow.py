from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas import AuditEventResponse, AuthorizationResponse, IntentResponse


class ProposalGenerateRequest(BaseModel):
    intent_id: str
    product_id: str
    quantity: int = 1
    add_ons: Optional[str] = "none"


class ProposalSnapshot(BaseModel):
    proposal_id: str
    intent_id: str
    user_id: str
    agent_id: str
    merchant_id: str
    product_id: str
    quantity: int
    proposed_price: Decimal
    currency: str = "INR"
    add_ons: Optional[str] = "none"
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProposalDecisionRequest(BaseModel):
    proposal_id: str
    intent_id: str
    decision: str  # "APPROVED" or "REJECTED"
    expiry_hours: int = 24


class WorkflowStatusResponse(BaseModel):
    intent: IntentResponse
    status: str
    proposal_snapshot: Optional[ProposalSnapshot] = None
    authorization: Optional[AuthorizationResponse] = None
    audit_events: List[AuditEventResponse] = []
    model_config = ConfigDict(from_attributes=True)
