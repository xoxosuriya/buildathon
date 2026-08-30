from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import schemas, models
from app.database import get_db
from app.services import payment_service

router = APIRouter(prefix="/payment", tags=["Payment"])


@router.post("", response_model=dict)
def payment_stub():
    return {
        "status": "stub",
        "message": "Razorpay Test Mode payment execution endpoint available at POST /payment/execute",
    }


@router.post("/execute", response_model=schemas.PaymentOrderResponse)
def execute_payment(
    req: schemas.PaymentExecuteRequest,
    db: Session = Depends(get_db),
):
    """
    Strict Payment Execution Gate:
    Evaluates stored VerificationResult. Only decision == 'ALLOW' can create a Razorpay Test Mode Order.
    Rejects BLOCK and REVIEW decisions cleanly. Idempotent on repeated calls.
    """
    return payment_service.execute_payment_service(db=db, req=req)
