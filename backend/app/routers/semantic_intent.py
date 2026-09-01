from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app import database
from app.schemas_semantic import (
    SemanticParseRequest,
    ParsedIntentBound,
    SemanticCreateResponse,
)
from app.services import semantic_intent_service

router = APIRouter(prefix="/intent/semantic", tags=["Semantic Intent Layer"])


@router.post("/parse", response_model=ParsedIntentBound, status_code=status.HTTP_200_OK)
def parse_semantic_intent_endpoint(req: SemanticParseRequest):
    """
    POST /intent/semantic/parse
    Parses natural-language user prompt into a structured intent representation.
    READ-ONLY / PARSE-ONLY: Does NOT authorize or create database records.
    """
    return semantic_intent_service.parse_semantic_prompt(req.prompt)


@router.post("/create", response_model=SemanticCreateResponse, status_code=status.HTTP_201_CREATED)
def create_semantic_intent_endpoint(
    req: SemanticParseRequest,
    db: Session = Depends(database.get_db),
):
    """
    POST /intent/semantic/create
    Parses, validates domain bounds, and creates canonical Intent & Authorization records in SQLite DB.
    Enforces Clarity Gate (returns HTTP 422 if max_amount is missing or intent is ambiguous).
    """
    return semantic_intent_service.create_semantic_intent_and_authorization(db=db, req=req)
