from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app import models
from app.database import engine
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
)

# Auto-create SQLite database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="INTENTLOCK API",
    description="AI-Commerce Transaction Safety Gateway",
    version="1.0.0",
)


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
