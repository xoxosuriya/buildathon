from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas import IntentResponse, AuthorizationResponse


class SemanticParseRequest(BaseModel):
    prompt: str = Field(..., description="Unstructured natural-language user prompt", min_length=1)
    user_id: Optional[str] = Field("USER-DEFAULT", description="Target user ID")
    agent_id: Optional[str] = Field("AGENT-DEFAULT", description="Target AI Agent ID")


class ParsedIntentBound(BaseModel):
    action: Literal["PURCHASE", "BOOK", "PAYMENT", "TRANSFER", "UNKNOWN"] = Field(
        "PURCHASE", description="Standardized transaction action"
    )
    product_query: str = Field(
        ..., description="Extracted product, service, or room description"
    )
    merchant_name: Optional[str] = Field(
        None, description="Extracted target merchant or store name"
    )
    max_amount: Optional[Decimal] = Field(
        None, description="Extracted maximum monetary limit in INR", ge=Decimal("0.00")
    )
    currency: str = Field("INR", description="Currency code")
    quantity: int = Field(1, description="Requested item quantity", ge=1)
    category: Optional[str] = Field(None, description="Inferred category (ELECTRONICS, HOSPITALITY, etc.)")
    intent_status: Literal["CLEAR", "PARTIAL", "AMBIGUOUS", "INVALID"] = Field(
        "CLEAR", description="Semantic clarity status"
    )
    missing_fields: List[str] = Field(
        default_factory=list, description="Fields required before intent creation"
    )
    clarification_prompt: Optional[str] = Field(
        None, description="Human clarification message if bounds are incomplete"
    )


class SemanticClarificationResponse(BaseModel):
    intent_status: Literal["PARTIAL", "AMBIGUOUS", "INVALID"]
    missing_fields: List[str]
    clarification_prompt: str
    parsed_draft: ParsedIntentBound


class SemanticCreateResponse(BaseModel):
    intent: IntentResponse
    authorization: Optional[AuthorizationResponse] = None
    parsed_semantic_bound: ParsedIntentBound
    message: str = "Semantic intent successfully validated and recorded."
    model_config = ConfigDict(from_attributes=True)
