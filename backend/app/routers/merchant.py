from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter(tags=["Merchant & MerchantState"])


@router.post("/merchant", response_model=schemas.MerchantResponse, status_code=status.HTTP_201_CREATED)
def create_merchant(merchant: schemas.MerchantCreate, db: Session = Depends(get_db)):
    return crud.create_merchant(db=db, merchant=merchant)


@router.get("/merchant", response_model=List[schemas.MerchantResponse])
def read_merchants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_merchants(db=db, skip=skip, limit=limit)


@router.get("/merchant/{merchant_id}", response_model=schemas.MerchantResponse)
def read_merchant(merchant_id: str, db: Session = Depends(get_db)):
    db_merchant = crud.get_merchant(db=db, merchant_id=merchant_id)
    if db_merchant is None:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return db_merchant


@router.post("/merchant-state", response_model=schemas.MerchantStateResponse, status_code=status.HTTP_201_CREATED)
def create_merchant_state(state: schemas.MerchantStateCreate, db: Session = Depends(get_db)):
    return crud.create_merchant_state(db=db, state=state)


@router.get("/merchant-state", response_model=List[schemas.MerchantStateResponse])
def read_merchant_states(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_merchant_states(db=db, skip=skip, limit=limit)


@router.get("/merchant-state/{state_id}", response_model=schemas.MerchantStateResponse)
def read_merchant_state(state_id: str, db: Session = Depends(get_db)):
    db_state = crud.get_merchant_state(db=db, state_id=state_id)
    if db_state is None:
        raise HTTPException(status_code=404, detail="MerchantState not found")
    return db_state
