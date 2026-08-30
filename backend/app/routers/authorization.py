from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/authorization", tags=["Authorization"])


@router.post("", response_model=schemas.AuthorizationResponse, status_code=status.HTTP_201_CREATED)
def create_authorization(auth: schemas.AuthorizationCreate, db: Session = Depends(get_db)):
    return crud.create_authorization(db=db, auth=auth)


@router.get("", response_model=List[schemas.AuthorizationResponse])
def read_authorizations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_authorizations(db=db, skip=skip, limit=limit)


@router.get("/{auth_id}", response_model=schemas.AuthorizationResponse)
def read_authorization(auth_id: str, db: Session = Depends(get_db)):
    db_auth = crud.get_authorization(db=db, auth_id=auth_id)
    if db_auth is None:
        raise HTTPException(status_code=404, detail="Authorization not found")
    return db_auth
