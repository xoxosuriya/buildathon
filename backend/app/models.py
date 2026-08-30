import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    intents = relationship("Intent", back_populates="user")
    authorizations = relationship("Authorization", back_populates="user")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    agent_type = Column(String, nullable=False)
    status = Column(String, default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    intents = relationship("Intent", back_populates="agent")
    authorizations = relationship("Authorization", back_populates="agent")


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    products = relationship("Product", back_populates="merchant")
    merchant_states = relationship("MerchantState", back_populates="merchant")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False, index=True)
    category = Column(String, nullable=False)
    price = Column(Numeric(18, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    merchant = relationship("Merchant", back_populates="products")
    merchant_states = relationship("MerchantState", back_populates="product")


class MerchantState(Base):
    __tablename__ = "merchant_states"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    price = Column(Numeric(18, 2), nullable=False)
    inventory = Column(Integer, nullable=False, default=0)
    offer_status = Column(String, nullable=False, default="NONE")
    is_available = Column(Boolean, nullable=False, default=True)
    last_verified_at = Column(DateTime, default=utc_now, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    merchant = relationship("Merchant", back_populates="merchant_states")
    product = relationship("Product", back_populates="merchant_states")


class Intent(Base):
    __tablename__ = "intents"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    raw_prompt = Column(Text, nullable=False)
    action = Column(String, nullable=False)
    category = Column(String, nullable=True)
    max_amount = Column(Numeric(18, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="CREATED")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="intents")
    agent = relationship("Agent", back_populates="intents")
    authorizations = relationship("Authorization", back_populates="intent")


class Authorization(Base):
    __tablename__ = "authorizations"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    intent_id = Column(String, ForeignKey("intents.id"), unique=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    action = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    max_amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String, nullable=False, default="INR")
    allowed_add_ons = Column(Text, nullable=True)
    expiry_time = Column(DateTime, nullable=True)
    confirmation_required = Column(Boolean, nullable=False, default=True)
    status = Column(String, nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    intent = relationship("Intent", back_populates="authorizations")
    user = relationship("User", back_populates="authorizations")
    agent = relationship("Agent", back_populates="authorizations")
    transactions = relationship("Transaction", back_populates="authorization")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    authorization_id = Column(String, ForeignKey("authorizations.id"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    requested_amount = Column(Numeric(18, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    currency = Column(String, nullable=False, default="INR")
    add_ons = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    authorization = relationship("Authorization", back_populates="transactions")
    verification_results = relationship("VerificationResult", back_populates="transaction")


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), unique=True, nullable=False)
    authorization_id = Column(String, ForeignKey("authorizations.id"), nullable=False)
    decision = Column(String, nullable=False, default="NOT_EVALUATED")
    reason = Column(Text, nullable=True)
    checks_passed = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    transaction = relationship("Transaction", back_populates="verification_results")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    trace_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    authorization_id = Column(String, ForeignKey("authorizations.id"), nullable=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=True)
    payload = Column(Text, nullable=True)
    previous_hash = Column(String(64), nullable=True)
    hash = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False)


import hashlib
from sqlalchemy import event, text

@event.listens_for(AuditEvent, "before_insert")
def set_audit_event_hash(mapper, connection, target):
    result = connection.execute(
        text("SELECT hash FROM audit_events ORDER BY timestamp DESC, id DESC LIMIT 1")
    ).fetchone()
    prev_hash = result[0] if (result and result[0]) else "0" * 64
    target.previous_hash = prev_hash

    content_to_hash = f"{prev_hash}|{target.trace_id}|{target.event_type}|{target.authorization_id or ''}|{target.transaction_id or ''}|{target.payload or ''}"
    target.hash = hashlib.sha256(content_to_hash.encode("utf-8")).hexdigest()


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), unique=True, nullable=False)
    verification_id = Column(String, ForeignKey("verification_results.id"), nullable=False)
    authorization_id = Column(String, ForeignKey("authorizations.id"), nullable=False)
    razorpay_order_id = Column(String, nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String, nullable=False, default="INR")
    status = Column(String, nullable=False, default="CREATED")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    transaction = relationship("Transaction")
    verification_result = relationship("VerificationResult")
    authorization = relationship("Authorization")
