from typing import List, Optional
from sqlalchemy.orm import Session
from app import models, schemas


# User CRUD
def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()


# Agent CRUD
def create_agent(db: Session, agent: schemas.AgentCreate) -> models.Agent:
    db_agent = models.Agent(**agent.model_dump())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent

def get_agent(db: Session, agent_id: str) -> Optional[models.Agent]:
    return db.query(models.Agent).filter(models.Agent.id == agent_id).first()

def get_agents(db: Session, skip: int = 0, limit: int = 100) -> List[models.Agent]:
    return db.query(models.Agent).offset(skip).limit(limit).all()


# Merchant CRUD
def create_merchant(db: Session, merchant: schemas.MerchantCreate) -> models.Merchant:
    db_merchant = models.Merchant(**merchant.model_dump())
    db.add(db_merchant)
    db.commit()
    db.refresh(db_merchant)
    return db_merchant

def get_merchant(db: Session, merchant_id: str) -> Optional[models.Merchant]:
    return db.query(models.Merchant).filter(models.Merchant.id == merchant_id).first()

def get_merchants(db: Session, skip: int = 0, limit: int = 100) -> List[models.Merchant]:
    return db.query(models.Merchant).offset(skip).limit(limit).all()


# Product CRUD
def create_product(db: Session, product: schemas.ProductCreate) -> models.Product:
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def get_product(db: Session, product_id: str) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100) -> List[models.Product]:
    return db.query(models.Product).offset(skip).limit(limit).all()


# MerchantState CRUD
def create_merchant_state(db: Session, state: schemas.MerchantStateCreate) -> models.MerchantState:
    db_state = models.MerchantState(**state.model_dump())
    db.add(db_state)
    db.commit()
    db.refresh(db_state)
    return db_state

def get_merchant_state(db: Session, state_id: str) -> Optional[models.MerchantState]:
    return db.query(models.MerchantState).filter(models.MerchantState.id == state_id).first()

def get_merchant_states(db: Session, skip: int = 0, limit: int = 100) -> List[models.MerchantState]:
    return db.query(models.MerchantState).offset(skip).limit(limit).all()


# Intent CRUD
def create_intent(db: Session, intent: schemas.IntentCreate) -> models.Intent:
    db_intent = models.Intent(**intent.model_dump())
    db.add(db_intent)
    db.commit()
    db.refresh(db_intent)
    return db_intent

def get_intent(db: Session, intent_id: str) -> Optional[models.Intent]:
    return db.query(models.Intent).filter(models.Intent.id == intent_id).first()

def get_intents(db: Session, skip: int = 0, limit: int = 100) -> List[models.Intent]:
    return db.query(models.Intent).offset(skip).limit(limit).all()


# Authorization CRUD
def create_authorization(db: Session, auth: schemas.AuthorizationCreate) -> models.Authorization:
    db_auth = models.Authorization(**auth.model_dump())
    db.add(db_auth)
    db.commit()
    db.refresh(db_auth)
    return db_auth

def get_authorization(db: Session, auth_id: str) -> Optional[models.Authorization]:
    return db.query(models.Authorization).filter(models.Authorization.id == auth_id).first()

def get_authorizations(db: Session, skip: int = 0, limit: int = 100) -> List[models.Authorization]:
    return db.query(models.Authorization).offset(skip).limit(limit).all()


# Transaction CRUD
def create_transaction(db: Session, tx: schemas.TransactionCreate) -> models.Transaction:
    db_tx = models.Transaction(**tx.model_dump())
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

def get_transaction(db: Session, tx_id: str) -> Optional[models.Transaction]:
    return db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()

def get_transactions(db: Session, skip: int = 0, limit: int = 100) -> List[models.Transaction]:
    return db.query(models.Transaction).offset(skip).limit(limit).all()


# VerificationResult CRUD (Stub mode in Phase 1)
def create_verification_result(db: Session, result: schemas.VerificationResultCreate) -> models.VerificationResult:
    db_res = models.VerificationResult(**result.model_dump())
    db.add(db_res)
    db.commit()
    db.refresh(db_res)
    return db_res

def get_verification_result(db: Session, result_id: str) -> Optional[models.VerificationResult]:
    return db.query(models.VerificationResult).filter(models.VerificationResult.id == result_id).first()


# AuditEvent CRUD (Strictly Append-Only: CREATE and READ ONLY with Hash Chaining)
def create_audit_event(db: Session, event: schemas.AuditEventCreate) -> models.AuditEvent:
    event_data = event.model_dump()
    event_data.pop("previous_hash", None)
    event_data.pop("hash", None)
    db_event = models.AuditEvent(**event_data)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_audit_event(db: Session, event_id: str) -> Optional[models.AuditEvent]:
    return db.query(models.AuditEvent).filter(models.AuditEvent.id == event_id).first()

def get_audit_events(db: Session, skip: int = 0, limit: int = 100) -> List[models.AuditEvent]:
    return db.query(models.AuditEvent).offset(skip).limit(limit).all()
