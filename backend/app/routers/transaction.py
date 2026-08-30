from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/transaction", tags=["Transaction"])


@router.post("", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(tx: schemas.TransactionCreate, db: Session = Depends(get_db)):
    return crud.create_transaction(db=db, tx=tx)


@router.get("", response_model=List[schemas.TransactionResponse])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_transactions(db=db, skip=skip, limit=limit)


@router.get("/{tx_id}", response_model=schemas.TransactionResponse)
def read_transaction(tx_id: str, db: Session = Depends(get_db)):
    db_tx = crud.get_transaction(db=db, tx_id=tx_id)
    if db_tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_tx
