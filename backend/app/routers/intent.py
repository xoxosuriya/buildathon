from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/intent", tags=["Intent"])


@router.post("", response_model=schemas.IntentResponse, status_code=status.HTTP_201_CREATED)
def create_intent(intent: schemas.IntentCreate, db: Session = Depends(get_db)):
    return crud.create_intent(db=db, intent=intent)


@router.get("", response_model=List[schemas.IntentResponse])
def read_intents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_intents(db=db, skip=skip, limit=limit)


@router.get("/{intent_id}", response_model=schemas.IntentResponse)
def read_intent(intent_id: str, db: Session = Depends(get_db)):
    db_intent = crud.get_intent(db=db, intent_id=intent_id)
    if db_intent is None:
        raise HTTPException(status_code=404, detail="Intent not found")
    return db_intent
