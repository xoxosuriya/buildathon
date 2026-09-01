import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

from sqlalchemy.pool import StaticPool

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


from sqlalchemy import text

@pytest.fixture(autouse=True)
def setup_test_db():
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine, checkfirst=True)
    db = TestingSessionLocal()
    try:
        from decimal import Decimal
        from datetime import datetime, timezone
        from app import models
        # Default User & Agent
        if not db.query(models.User).filter(models.User.id == "USER-DEFAULT").first():
            db.add(models.User(id="USER-DEFAULT", name="IntentLock Demo User", email="user@intentlock.io"))
        if not db.query(models.Agent).filter(models.Agent.id == "AGENT-DEFAULT").first():
            db.add(models.Agent(id="AGENT-DEFAULT", name="ShoppingBuddy Agent", agent_type="E-COMMERCE_AGENT", status="ACTIVE"))
        
        # BUY: TechZone Merchant & Ergonomic Mouse Product
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
        db.commit()
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)
