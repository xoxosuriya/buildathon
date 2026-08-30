from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# User Schemas
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Agent Schemas
class AgentBase(BaseModel):
    name: str
    agent_type: str
    status: str = "ACTIVE"

class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Merchant Schemas
class MerchantBase(BaseModel):
    name: str
    category: str
    status: str = "ACTIVE"

class MerchantCreate(MerchantBase):
    pass

class MerchantResponse(MerchantBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Product Schemas
class ProductBase(BaseModel):
    merchant_id: str
    name: str
    sku: str
    category: str
    price: Decimal = Field(ge=Decimal("0.00"))
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# MerchantState Schemas
class MerchantStateBase(BaseModel):
    merchant_id: str
    product_id: str
    price: Decimal
    inventory: int = 0
    offer_status: str = "NONE"
    is_available: bool = True

class MerchantStateCreate(MerchantStateBase):
    pass

class MerchantStateResponse(MerchantStateBase):
    id: str
    last_verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Intent Schemas
class IntentBase(BaseModel):
    user_id: str
    agent_id: str
    raw_prompt: str
    action: str
    category: Optional[str] = None
    max_amount: Decimal
    quantity: int = 1
    status: str = "CREATED"

class IntentCreate(IntentBase):
    pass

class IntentResponse(IntentBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Authorization Schemas
class AuthorizationBase(BaseModel):
    intent_id: str
    user_id: str
    agent_id: str
    merchant_id: str
    product_id: str
    action: str
    quantity: int = 1
    max_amount: Decimal
    currency: str = "INR"
    allowed_add_ons: Optional[str] = None
    expiry_time: Optional[datetime] = None
    confirmation_required: bool = True
    status: str = "ACTIVE"

class AuthorizationCreate(AuthorizationBase):
    pass

class AuthorizationResponse(AuthorizationBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Transaction Schemas
class TransactionBase(BaseModel):
    authorization_id: str
    agent_id: str
    merchant_id: str
    product_id: str
    requested_amount: Decimal
    quantity: int = 1
    currency: str = "INR"
    add_ons: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# VerificationResult Schemas
class VerificationResultBase(BaseModel):
    transaction_id: str
    authorization_id: str
    decision: str = "NOT_EVALUATED"
    reason: Optional[str] = None
    checks_passed: Optional[str] = None
    evidence: Optional[str] = None

class VerificationResultCreate(VerificationResultBase):
    pass

class VerificationResultResponse(VerificationResultBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# AuditEvent Schemas (Append-only: Create and Read only)
class AuditEventBase(BaseModel):
    trace_id: str
    event_type: str
    authorization_id: Optional[str] = None
    transaction_id: Optional[str] = None
    payload: Optional[str] = None
    previous_hash: Optional[str] = None
    hash: Optional[str] = None

class AuditEventCreate(AuditEventBase):
    pass

class AuditEventResponse(AuditEventBase):
    id: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


# Phase 4 Schemas: Payment, Review Resolution & Dashboard Analytics
class PaymentExecuteRequest(BaseModel):
    transaction_id: str
    verification_id: Optional[str] = None

class PaymentOrderResponse(BaseModel):
    id: str
    transaction_id: str
    verification_id: str
    authorization_id: str
    razorpay_order_id: str
    amount: Decimal
    currency: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReviewResolveRequest(BaseModel):
    reason: str
    action: Optional[str] = "ACCEPT"
    accepted_price: Optional[Decimal] = None

class DashboardStatsResponse(BaseModel):
    total_transactions: int
    allowed_count: int
    review_count: int
    blocked_count: int
    total_amount_blocked: Decimal
    active_agents: int
