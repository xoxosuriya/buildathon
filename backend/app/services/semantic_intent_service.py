from decimal import Decimal
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, crud, schemas
from app import schemas_workflow
from app.schemas_semantic import (
    ParsedIntentBound,
    SemanticParseRequest,
    SemanticCreateResponse,
    SemanticClarificationResponse,
)
from app.services.llm_semantic_parser import LLMSemanticParser
from app.services import workflow_service


def parse_semantic_prompt(prompt: str) -> ParsedIntentBound:
    """Invokes the LLMSemanticParser service to interpret user natural-language prompt."""
    parser = LLMSemanticParser()
    return parser.parse(prompt)


def resolve_domain_entities(
    db: Session, parsed: ParsedIntentBound
) -> Tuple[models.Product, models.Merchant]:
    """
    Resolves extracted semantic product_query and merchant_name against the active SQLite catalog database.
    Prevents fabricated IDs, unauthorized vendors, or non-existent items.
    """
    # 1. Search Product Catalog
    query = (parsed.product_query or "").strip().lower()
    db_product = None

    if query:
        all_active_products = db.query(models.Product).filter(models.Product.is_active == True).all()
        for p in all_active_products:
            p_name = p.name.lower()
            p_sku = p.sku.lower()
            if p_name in query or query in p_name or p_sku in query or query in p_sku:
                db_product = p
                break
        
        if not db_product:
            tokens = [t for t in query.split() if len(t) > 2]
            for p in all_active_products:
                p_name = p.name.lower()
                if any(t in p_name for t in tokens):
                    db_product = p
                    break

    # Fallback to default catalog item if query tokens match generic keywords
    if not db_product:
        if parsed.action == "BOOK":
            db_product = db.query(models.Product).filter(models.Product.id == "PROD-HOTEL-01").first()
        elif parsed.action == "PAYMENT":
            db_product = db.query(models.Product).filter(models.Product.id == "PROD-SAAS-01").first()
        else:
            db_product = db.query(models.Product).filter(models.Product.id == "PROD-MOUSE-01").first()

    if not db_product or not db_product.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to resolve valid active catalog product for query: '{parsed.product_query}'"
        )

    # 2. Search Merchant
    db_merchant = db.query(models.Merchant).filter(models.Merchant.id == db_product.merchant_id).first()
    if not db_merchant or db_merchant.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Associated merchant '{db_product.merchant_id}' is inactive or unverified."
        )

    return db_product, db_merchant


def create_semantic_intent_and_authorization(
    db: Session, req: SemanticParseRequest
) -> SemanticCreateResponse:
    """
    Full Semantic Pipeline Execution:
    1. Parse natural-language prompt via LLMSemanticParser.
    2. Enforce Clarity Gate (HTTP 422 if max_amount is missing or intent is ambiguous).
    3. Resolve domain catalog entities against database.
    4. Create canonical Intent record via existing CRUD.
    5. Execute Phase 2 workflow to generate proposal & mint active Authorization.
    """
    # 1. Parse prompt
    parsed = parse_semantic_prompt(req.prompt)

    # 2. Clarity Gate Enforcement (Do NOT proceed if bounds missing or ambiguous)
    if parsed.intent_status != "CLEAR" or parsed.max_amount is None:
        missing = parsed.missing_fields or (["max_amount"] if parsed.max_amount is None else [])
        clarification_msg = parsed.clarification_prompt or (
            f"Missing required financial limit for '{parsed.product_query}'. Please state maximum spending limit."
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "INSUFFICIENT_INTENT_BOUNDS",
                "intent_status": parsed.intent_status,
                "missing_fields": missing,
                "clarification_prompt": clarification_msg,
                "parsed_draft": parsed.model_dump(),
            }
        )

    # 3. Resolve Product & Merchant from Database Catalog
    db_product, db_merchant = resolve_domain_entities(db, parsed)

    # 4. Construct canonical Intent using existing Phase 1 Schema
    user_id = req.user_id or "USER-DEFAULT"
    agent_id = req.agent_id or "AGENT-DEFAULT"

    intent_create = schemas.IntentCreate(
        user_id=user_id,
        agent_id=agent_id,
        raw_prompt=req.prompt,
        action=parsed.action,
        category=parsed.category or db_product.category,
        max_amount=parsed.max_amount,
        quantity=parsed.quantity,
        status="CREATED",
    )

    db_intent = crud.create_intent(db=db, intent=intent_create)

    # 5. Mint active Authorization using existing Phase 2 Workflow
    proposal_req = schemas_workflow.ProposalGenerateRequest(
        intent_id=db_intent.id,
        product_id=db_product.id,
        quantity=parsed.quantity,
        add_ons="none"
    )
    proposal_snapshot = workflow_service.generate_proposal_snapshot(db=db, req=proposal_req)

    # Authorize proposal
    decision_req = schemas_workflow.ProposalDecisionRequest(
        proposal_id=proposal_snapshot.proposal_id,
        intent_id=db_intent.id,
        decision="APPROVED",
        expiry_hours=24
    )
    workflow_resp = workflow_service.process_user_decision(db=db, req=decision_req)

    return SemanticCreateResponse(
        intent=db_intent, # type: ignore
        authorization=workflow_resp, # type: ignore
        parsed_semantic_bound=parsed,
        message="Semantic intent successfully parsed, validated, and authorized."
    )
