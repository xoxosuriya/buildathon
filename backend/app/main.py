from decimal import Decimal
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models
from app.database import engine, SessionLocal
from app.routers import (
    health,
    user,
    agent,
    merchant,
    product,
    intent,
    authorization,
    transaction,
    verify,
    audit,
    payment,
    workflow,
    catalog,
    semantic_intent,
)

# Auto-create SQLite database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="INTENTLOCK API",
    description="AI-Commerce Transaction Safety Gateway",
    version="1.0.0",
)


@app.on_event("startup")
def seed_default_entities():
    """Ensure default DB entities exist for the real application workflow."""
    db: Session = SessionLocal()
    try:
        # Default User & Agent
        if not db.query(models.User).filter(models.User.id == "USER-DEFAULT").first():
            db.add(models.User(id="USER-DEFAULT", name="IntentLock Demo User", email="user@intentlock.io"))
        if not db.query(models.Agent).filter(models.Agent.id == "AGENT-DEFAULT").first():
            db.add(models.Agent(id="AGENT-DEFAULT", name="ShoppingBuddy Agent", agent_type="E-COMMERCE_AGENT", status="ACTIVE"))
        
        # 1. BUY: TechZone Merchant & Ergonomic Mouse Product
        if not db.query(models.Merchant).filter(models.Merchant.id == "MERCH-TECHZONE-01").first():
            db.add(models.Merchant(id="MERCH-TECHZONE-01", name="Authorized TechZone Merchant", category="ELECTRONICS", status="ACTIVE"))
        if not db.query(models.Product).filter(models.Product.id == "PROD-MOUSE-01").first():
            db.add(models.Product(
                id="PROD-MOUSE-01",
                merchant_id="MERCH-TECHZONE-01",
                name="Wireless Ergonomic Mouse",
                sku="SKU-MOUSE-ERG",
                category="ELECTRONICS",
                price=Decimal("1200.00"),
                is_active=True,
            ))
        if not db.query(models.MerchantState).filter(models.MerchantState.product_id == "PROD-MOUSE-01").first():
            db.add(models.MerchantState(
                id="MS-MOUSE-01",
                merchant_id="MERCH-TECHZONE-01",
                product_id="PROD-MOUSE-01",
                price=Decimal("1200.00"),
                inventory=25,
                offer_status="ACTIVE",
                is_available=True,
                last_verified_at=datetime.now(timezone.utc),
            ))

        # 2. BOOK: Grand Plaza Hotel Merchant & Hotel Suite Product
        if not db.query(models.Merchant).filter(models.Merchant.id == "MERCH-HOTEL-01").first():
            db.add(models.Merchant(id="MERCH-HOTEL-01", name="Grand Plaza Hotel", category="HOSPITALITY", status="ACTIVE"))
        if not db.query(models.Product).filter(models.Product.id == "PROD-HOTEL-01").first():
            db.add(models.Product(
                id="PROD-HOTEL-01",
                merchant_id="MERCH-HOTEL-01",
                name="Deluxe Hotel Suite (1 Night)",
                sku="SKU-HOTEL-SUITE",
                category="HOSPITALITY",
                price=Decimal("4800.00"),
                is_active=True,
            ))
        if not db.query(models.MerchantState).filter(models.MerchantState.product_id == "PROD-HOTEL-01").first():
            db.add(models.MerchantState(
                id="MS-HOTEL-01",
                merchant_id="MERCH-HOTEL-01",
                product_id="PROD-HOTEL-01",
                price=Decimal("4800.00"),
                inventory=10,
                offer_status="ACTIVE",
                is_available=True,
                last_verified_at=datetime.now(timezone.utc),
            ))

        # 3. PAYMENT: SaaS Cloud Inc Merchant & Subscription Product
        if not db.query(models.Merchant).filter(models.Merchant.id == "MERCH-SAAS-01").first():
            db.add(models.Merchant(id="MERCH-SAAS-01", name="SaaS Cloud Inc.", category="SOFTWARE", status="ACTIVE"))
        if not db.query(models.Product).filter(models.Product.id == "PROD-SAAS-01").first():
            db.add(models.Product(
                id="PROD-SAAS-01",
                merchant_id="MERCH-SAAS-01",
                name="SaaS Enterprise Subscription",
                sku="SKU-SAAS-SUB",
                category="SOFTWARE",
                price=Decimal("8500.00"),
                is_active=True,
            ))
        if not db.query(models.MerchantState).filter(models.MerchantState.product_id == "PROD-SAAS-01").first():
            db.add(models.MerchantState(
                id="MS-SAAS-01",
                merchant_id="MERCH-SAAS-01",
                product_id="PROD-SAAS-01",
                price=Decimal("8500.00"),
                inventory=50,
                offer_status="ACTIVE",
                is_available=True,
                last_verified_at=datetime.now(timezone.utc),
            ))

        # 4. MUTATION TEST ENTITIES: Unapproved product SKU & Unauthorized merchant
        if not db.query(models.Merchant).filter(models.Merchant.id == "MERCH-UNVERIFIED-MARKETPLACE").first():
            db.add(models.Merchant(id="MERCH-UNVERIFIED-MARKETPLACE", name="Unverified Marketplace Vendor", category="UNKNOWN", status="SUSPENDED"))
        if not db.query(models.Product).filter(models.Product.id == "PROD-UNAPPROVED-SUB").first():
            db.add(models.Product(
                id="PROD-UNAPPROVED-SUB",
                merchant_id="MERCH-TECHZONE-01",
                name="Unapproved Product SKU",
                sku="SKU-UNAPPROVED-SUB",
                category="ELECTRONICS",
                price=Decimal("1200.00"),
                is_active=True,
            ))
        if not db.query(models.MerchantState).filter(models.MerchantState.product_id == "PROD-UNAPPROVED-SUB").first():
            db.add(models.MerchantState(
                id="MS-UNAPPROVED-SUB",
                merchant_id="MERCH-TECHZONE-01",
                product_id="PROD-UNAPPROVED-SUB",
                price=Decimal("1200.00"),
                inventory=100,
                offer_status="ACTIVE",
                is_available=True,
                last_verified_at=datetime.now(timezone.utc),
            ))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Startup seed notice: {e}")
    finally:
        db.close()


@app.exception_handler(IntegrityError)
def integrity_error_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"detail": f"Database constraint or foreign key integrity error: {str(exc.orig)}"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(user.router)
app.include_router(agent.router)
app.include_router(merchant.router)
app.include_router(product.router)
app.include_router(intent.router)
app.include_router(authorization.router)
app.include_router(transaction.router)
app.include_router(verify.router)
app.include_router(audit.router)
app.include_router(payment.router)
app.include_router(workflow.router)
app.include_router(catalog.router)
app.include_router(semantic_intent.router)


