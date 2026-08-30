import os
import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Set
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app import models, crud, schemas, schemas_workflow


class CheckResult(BaseModel):
    check: str
    category: str
    status: str  # PASS | FAIL | FLAG | SKIPPED
    reason: str
    expected: str
    actual: str
    evidence: str


def get_stale_threshold_hours() -> float:
    val_str = os.getenv("INTENTLOCK_MERCHANT_STATE_STALE_HOURS", "24.0")
    try:
        val = float(val_str)
        return val if val > 0 else 24.0
    except ValueError:
        return 24.0


def parse_addon_tokens(raw_addons: Optional[str]) -> Set[str]:
    if not raw_addons:
        return set()
    tokens = [t.strip().lower() for t in raw_addons.split(",") if t.strip()]
    cleaned = set()
    for tok in tokens:
        if tok != "none":
            cleaned.add(tok)
    return cleaned


def verify_transaction_by_id(db: Session, transaction_id: str) -> models.VerificationResult:
    # 1. IDEMPOTENCY CHECK FIRST: Return existing finalized result if already verified
    existing_res = (
        db.query(models.VerificationResult)
        .filter(models.VerificationResult.transaction_id == transaction_id)
        .first()
    )
    if existing_res:
        return existing_res

    # 2. Fetch Transaction record
    db_txn = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not db_txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    check_results: List[CheckResult] = []
    now_utc = datetime.now(timezone.utc)

    # 3. Fetch Authorization
    db_auth = (
        db.query(models.Authorization)
        .filter(models.Authorization.id == db_txn.authorization_id)
        .first()
    )

    # Check 1: authorization_exists
    if not db_auth:
        check_results.append(
            CheckResult(
                check="authorization_exists",
                category="AUTHORIZATION_INTEGRITY",
                status="FAIL",
                reason="Referenced Authorization ID does not exist in database",
                expected=f"Valid Authorization ID ({db_txn.authorization_id})",
                actual="None",
                evidence=f"db.query(Authorization).get('{db_txn.authorization_id}') is None",
            )
        )
    else:
        check_results.append(
            CheckResult(
                check="authorization_exists",
                category="AUTHORIZATION_INTEGRITY",
                status="PASS",
                reason="Authorization record exists",
                expected=f"Valid Authorization ID ({db_auth.id})",
                actual=db_auth.id,
                evidence=f"Authorization.id == '{db_auth.id}'",
            )
        )

    # Check 2: authorization_active
    if db_auth:
        if db_auth.status != "ACTIVE":
            check_results.append(
                CheckResult(
                    check="authorization_active",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Authorization status is '{db_auth.status}', not 'ACTIVE'",
                    expected="ACTIVE",
                    actual=db_auth.status,
                    evidence=f"Authorization.status == '{db_auth.status}'",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="authorization_active",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Authorization status is ACTIVE",
                    expected="ACTIVE",
                    actual="ACTIVE",
                    evidence="Authorization.status == 'ACTIVE'",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="authorization_active",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="ACTIVE",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 3: authorization_not_expired
    if db_auth:
        if db_auth.expiry_time and now_utc > db_auth.expiry_time.replace(tzinfo=timezone.utc) if db_auth.expiry_time.tzinfo is None else db_auth.expiry_time:
            check_results.append(
                CheckResult(
                    check="authorization_not_expired",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Authorization expired at {db_auth.expiry_time}",
                    expected=f"> {now_utc.isoformat()}",
                    actual=str(db_auth.expiry_time),
                    evidence=f"{now_utc.isoformat()} > {db_auth.expiry_time}",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="authorization_not_expired",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Authorization is unexpired",
                    expected=f"> {now_utc.isoformat()}",
                    actual=str(db_auth.expiry_time),
                    evidence="Authorization expiry_time is in the future",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="authorization_not_expired",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Unexpired",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Fetch Intent for Intent Relationship checks
    db_intent = None
    if db_auth:
        db_intent = (
            db.query(models.Intent)
            .filter(models.Intent.id == db_auth.intent_id)
            .first()
        )

    # Check 4: intent_relationship_valid
    if db_auth:
        if not db_intent:
            check_results.append(
                CheckResult(
                    check="intent_relationship_valid",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Authorization.intent_id '{db_auth.intent_id}' does not exist",
                    expected="Valid Intent ID",
                    actual="None",
                    evidence=f"Intent '{db_auth.intent_id}' not found",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="intent_relationship_valid",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Authorization intent_id matches valid Intent record",
                    expected=db_intent.id,
                    actual=db_intent.id,
                    evidence=f"Authorization.intent_id == Intent.id == '{db_intent.id}'",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="intent_relationship_valid",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Valid Intent",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 5: internal_relationship_consistency
    if db_auth and db_intent:
        user_match = (db_auth.user_id == db_intent.user_id)
        agent_match = (db_auth.agent_id == db_intent.agent_id)
        if not (user_match and agent_match):
            check_results.append(
                CheckResult(
                    check="internal_relationship_consistency",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason="Authorization user/agent does not match parent Intent user/agent",
                    expected=f"user={db_intent.user_id}, agent={db_intent.agent_id}",
                    actual=f"user={db_auth.user_id}, agent={db_auth.agent_id}",
                    evidence=f"user_match={user_match}, agent_match={agent_match}",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="internal_relationship_consistency",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="User and Agent identities match parent Intent",
                    expected=f"user={db_intent.user_id}, agent={db_intent.agent_id}",
                    actual=f"user={db_auth.user_id}, agent={db_auth.agent_id}",
                    evidence="User ID and Agent ID are internally consistent",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="internal_relationship_consistency",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing Authorization or Intent",
                expected="Consistent identities",
                actual="N/A",
                evidence="Authorization or Intent is None",
            )
        )

    # Check 5b: agent_non_delegation_match (Non-Delegation Security)
    if db_auth:
        if not db_txn.agent_id or db_txn.agent_id != db_auth.agent_id:
            check_results.append(
                CheckResult(
                    check="agent_non_delegation_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"NON_DELEGATION_VIOLATION: Requesting agent ({db_txn.agent_id}) does not match capability authorized agent ({db_auth.agent_id})",
                    expected=f"Agent ID == {db_auth.agent_id}",
                    actual=str(db_txn.agent_id),
                    evidence=f"Transaction.agent_id ('{db_txn.agent_id}') != Authorization.agent_id ('{db_auth.agent_id}')",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="agent_non_delegation_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Requesting agent identity matches capability authorized agent",
                    expected=f"Agent ID == {db_auth.agent_id}",
                    actual=str(db_txn.agent_id),
                    evidence=f"Transaction.agent_id ('{db_txn.agent_id}') == Authorization.agent_id ('{db_auth.agent_id}')",
                )
            )

    # Check 6: merchant_match
    if db_auth:
        if db_txn.merchant_id != db_auth.merchant_id:
            check_results.append(
                CheckResult(
                    check="merchant_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason="Transaction merchant_id does not match Authorization merchant_id",
                    expected=db_auth.merchant_id,
                    actual=db_txn.merchant_id,
                    evidence=f"'{db_txn.merchant_id}' != '{db_auth.merchant_id}'",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="merchant_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Transaction merchant matches Authorization merchant",
                    expected=db_auth.merchant_id,
                    actual=db_txn.merchant_id,
                    evidence="Transaction merchant_id == Authorization merchant_id",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="merchant_match",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Merchant match",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 7: product_match
    if db_auth:
        if db_txn.product_id != db_auth.product_id:
            check_results.append(
                CheckResult(
                    check="product_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason="Transaction product_id does not match Authorization product_id",
                    expected=db_auth.product_id,
                    actual=db_txn.product_id,
                    evidence=f"'{db_txn.product_id}' != '{db_auth.product_id}'",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="product_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Transaction product matches Authorization product",
                    expected=db_auth.product_id,
                    actual=db_txn.product_id,
                    evidence="Transaction product_id == Authorization product_id",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="product_match",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Product match",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 8: amount_non_negative
    requested_amount_dec = Decimal(str(db_txn.requested_amount))
    if requested_amount_dec < Decimal("0.00"):
        check_results.append(
            CheckResult(
                check="amount_non_negative",
                category="AUTHORIZATION_INTEGRITY",
                status="FAIL",
                reason="Transaction requested_amount cannot be negative",
                expected=">= 0.00",
                actual=str(requested_amount_dec),
                evidence=f"{requested_amount_dec} < 0.00",
            )
        )
    else:
        check_results.append(
            CheckResult(
                check="amount_non_negative",
                category="AUTHORIZATION_INTEGRITY",
                status="PASS",
                reason="Requested amount is non-negative",
                expected=">= 0.00",
                actual=str(requested_amount_dec),
                evidence=f"{requested_amount_dec} >= 0.00",
            )
        )

    # Check 9: currency_match
    txn_curr = (db_txn.currency or "INR").strip().upper()
    if db_auth:
        auth_curr = (db_auth.currency or "INR").strip().upper()
        if txn_curr != auth_curr:
            check_results.append(
                CheckResult(
                    check="currency_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Transaction currency ({txn_curr}) does not match Authorization currency ({auth_curr})",
                    expected=auth_curr,
                    actual=txn_curr,
                    evidence=f"'{txn_curr}' != '{auth_curr}'",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="currency_match",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Transaction currency matches Authorization currency",
                    expected=auth_curr,
                    actual=txn_curr,
                    evidence=f"'{txn_curr}' == '{auth_curr}'",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="currency_match",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Currency match",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 10: amount_within_limit
    if db_auth:
        auth_max_dec = Decimal(str(db_auth.max_amount))
        if requested_amount_dec > auth_max_dec:
            check_results.append(
                CheckResult(
                    check="amount_within_limit",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Requested amount ({requested_amount_dec}) exceeds authorized maximum ceiling ({auth_max_dec})",
                    expected=f"<= {auth_max_dec}",
                    actual=str(requested_amount_dec),
                    evidence=f"Decimal('{requested_amount_dec}') > Decimal('{auth_max_dec}')",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="amount_within_limit",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Requested amount is within authorized ceiling",
                    expected=f"<= {auth_max_dec}",
                    actual=str(requested_amount_dec),
                    evidence=f"Decimal('{requested_amount_dec}') <= Decimal('{auth_max_dec}')",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="amount_within_limit",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Amount limit",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 11: quantity_positive
    if db_txn.quantity <= 0:
        check_results.append(
            CheckResult(
                check="quantity_positive",
                category="AUTHORIZATION_INTEGRITY",
                status="FAIL",
                reason="Transaction quantity must be greater than zero",
                expected="> 0",
                actual=str(db_txn.quantity),
                evidence=f"{db_txn.quantity} <= 0",
            )
        )
    else:
        check_results.append(
            CheckResult(
                check="quantity_positive",
                category="AUTHORIZATION_INTEGRITY",
                status="PASS",
                reason="Quantity is positive",
                expected="> 0",
                actual=str(db_txn.quantity),
                evidence=f"{db_txn.quantity} > 0",
            )
        )

    # Check 12: quantity_within_limit
    if db_auth:
        if db_txn.quantity > db_auth.quantity:
            check_results.append(
                CheckResult(
                    check="quantity_within_limit",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Transaction quantity ({db_txn.quantity}) exceeds authorized quantity ({db_auth.quantity})",
                    expected=f"<= {db_auth.quantity}",
                    actual=str(db_txn.quantity),
                    evidence=f"{db_txn.quantity} > {db_auth.quantity}",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="quantity_within_limit",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="Transaction quantity is within authorized limit",
                    expected=f"<= {db_auth.quantity}",
                    actual=str(db_txn.quantity),
                    evidence=f"{db_txn.quantity} <= {db_auth.quantity}",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="quantity_within_limit",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Quantity limit",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 13: addons_permitted (Strict Token Whitelist)
    if db_auth:
        allowed_tokens = parse_addon_tokens(db_auth.allowed_add_ons)
        requested_tokens = parse_addon_tokens(db_txn.add_ons)

        if not requested_tokens.issubset(allowed_tokens):
            unauthorized = requested_tokens - allowed_tokens
            check_results.append(
                CheckResult(
                    check="addons_permitted",
                    category="AUTHORIZATION_INTEGRITY",
                    status="FAIL",
                    reason=f"Requested add-ons contain unauthorized items: {sorted(list(unauthorized))}",
                    expected=f"Subset of {sorted(list(allowed_tokens))}",
                    actual=str(sorted(list(requested_tokens))),
                    evidence=f"Unauthorized tokens: {sorted(list(unauthorized))}",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="addons_permitted",
                    category="AUTHORIZATION_INTEGRITY",
                    status="PASS",
                    reason="All requested add-ons are authorized",
                    expected=f"Subset of {sorted(list(allowed_tokens))}",
                    actual=str(sorted(list(requested_tokens))),
                    evidence="Requested add-on token set is a subset of authorized whitelist",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="addons_permitted",
                category="AUTHORIZATION_INTEGRITY",
                status="SKIPPED",
                reason="Skipped due to missing upstream Authorization",
                expected="Add-on whitelist check",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Fetch Category B entities: Merchant, Product, MerchantState
    db_merchant = (
        db.query(models.Merchant)
        .filter(models.Merchant.id == db_txn.merchant_id)
        .first()
    )
    db_product = (
        db.query(models.Product)
        .filter(models.Product.id == db_txn.product_id)
        .first()
    )
    # Authoritative MerchantState selection: newest applicable record by effective timestamp (last_verified_at or created_at)
    effective_ts = func.coalesce(
        models.MerchantState.last_verified_at, models.MerchantState.created_at
    )
    db_state = (
        db.query(models.MerchantState)
        .filter(models.MerchantState.product_id == db_txn.product_id)
        .order_by(effective_ts.desc(), models.MerchantState.id.desc())
        .first()
    )

    # Check 14: merchant_exists_and_active
    if not db_merchant:
        check_results.append(
            CheckResult(
                check="merchant_exists_and_active",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason=f"Merchant ID '{db_txn.merchant_id}' does not exist in database",
                expected="ACTIVE Merchant",
                actual="None",
                evidence=f"Merchant '{db_txn.merchant_id}' not found",
            )
        )
    elif db_merchant.status != "ACTIVE":
        check_results.append(
            CheckResult(
                check="merchant_exists_and_active",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason=f"Merchant status is '{db_merchant.status}', not 'ACTIVE'",
                expected="ACTIVE",
                actual=db_merchant.status,
                evidence=f"Merchant.status == '{db_merchant.status}'",
            )
        )
    else:
        check_results.append(
            CheckResult(
                check="merchant_exists_and_active",
                category="MERCHANT_VALIDITY",
                status="PASS",
                reason="Merchant exists and is ACTIVE",
                expected="ACTIVE",
                actual="ACTIVE",
                evidence="Merchant.status == 'ACTIVE'",
            )
        )

    # Check 15: product_exists_and_active
    if not db_product:
        check_results.append(
            CheckResult(
                check="product_exists_and_active",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason=f"Product ID '{db_txn.product_id}' does not exist in database",
                expected="Active Product",
                actual="None",
                evidence=f"Product '{db_txn.product_id}' not found",
            )
        )
    elif not db_product.is_active:
        check_results.append(
            CheckResult(
                check="product_exists_and_active",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason="Product is inactive",
                expected="is_active == True",
                actual="is_active == False",
                evidence="Product.is_active is False",
            )
        )
    else:
        check_results.append(
            CheckResult(
                check="product_exists_and_active",
                category="MERCHANT_VALIDITY",
                status="PASS",
                reason="Product exists and is ACTIVE",
                expected="is_active == True",
                actual="is_active == True",
                evidence="Product.is_active is True",
            )
        )

    # Check 16: product_merchant_hierarchy
    if db_product:
        if db_product.merchant_id != db_txn.merchant_id:
            check_results.append(
                CheckResult(
                    check="product_merchant_hierarchy",
                    category="MERCHANT_VALIDITY",
                    status="FAIL",
                    reason="Product merchant_id does not match Transaction merchant_id",
                    expected=db_txn.merchant_id,
                    actual=db_product.merchant_id,
                    evidence=f"'{db_product.merchant_id}' != '{db_txn.merchant_id}'",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="product_merchant_hierarchy",
                    category="MERCHANT_VALIDITY",
                    status="PASS",
                    reason="Product belongs to Transaction merchant",
                    expected=db_txn.merchant_id,
                    actual=db_product.merchant_id,
                    evidence="Product.merchant_id == Transaction.merchant_id",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="product_merchant_hierarchy",
                category="MERCHANT_VALIDITY",
                status="SKIPPED",
                reason="Skipped due to missing Product",
                expected="Hierarchy match",
                actual="N/A",
                evidence="Product is None",
            )
        )

    # Check 17: merchant_state_valid
    if not db_state:
        check_results.append(
            CheckResult(
                check="merchant_state_valid",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason=f"No MerchantState record found for product '{db_txn.product_id}'",
                expected="Available MerchantState",
                actual="None",
                evidence="MerchantState lookup returned None",
            )
        )
    elif not db_state.is_available:
        check_results.append(
            CheckResult(
                check="merchant_state_valid",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason="MerchantState indicates product is currently unavailable",
                expected="is_available == True",
                actual="is_available == False",
                evidence="MerchantState.is_available is False",
            )
        )
    elif db_state.product_id != db_txn.product_id or db_state.merchant_id != db_txn.merchant_id:
        check_results.append(
            CheckResult(
                check="merchant_state_valid",
                category="MERCHANT_VALIDITY",
                status="FAIL",
                reason="MerchantState product or merchant ID mismatch",
                expected=f"merchant={db_txn.merchant_id}, product={db_txn.product_id}",
                actual=f"merchant={db_state.merchant_id}, product={db_state.product_id}",
                evidence="MerchantState hierarchy mismatch",
            )
        )
    else:
        check_results.append(
            CheckResult(
                check="merchant_state_valid",
                category="MERCHANT_VALIDITY",
                status="PASS",
                reason="MerchantState is valid and available",
                expected="Valid and Available",
                actual="Available",
                evidence="MerchantState exists, is_available is True, hierarchy matches",
            )
        )

    # Check 18: inventory_sufficient
    if db_state:
        if db_txn.quantity > db_state.inventory:
            check_results.append(
                CheckResult(
                    check="inventory_sufficient",
                    category="MERCHANT_VALIDITY",
                    status="FAIL",
                    reason=f"Transaction quantity ({db_txn.quantity}) exceeds merchant inventory ({db_state.inventory})",
                    expected=f"<= {db_state.inventory}",
                    actual=str(db_txn.quantity),
                    evidence=f"{db_txn.quantity} > {db_state.inventory}",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="inventory_sufficient",
                    category="MERCHANT_VALIDITY",
                    status="PASS",
                    reason="Merchant inventory is sufficient",
                    expected=f"<= {db_state.inventory}",
                    actual=str(db_txn.quantity),
                    evidence=f"{db_txn.quantity} <= {db_state.inventory}",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="inventory_sufficient",
                category="MERCHANT_VALIDITY",
                status="SKIPPED",
                reason="Skipped due to missing MerchantState",
                expected="Sufficient inventory",
                actual="N/A",
                evidence="MerchantState is None",
            )
        )

    # Category C: Temporal & Operational Checks
    # Check 19: replay_protection
    if db_auth:
        if db_auth.status != "ACTIVE":
            check_results.append(
                CheckResult(
                    check="replay_protection",
                    category="TEMPORAL_OPERATIONAL",
                    status="FAIL",
                    reason=f"Replay attack detected: Authorization has already been consumed (status='{db_auth.status}')",
                    expected="ACTIVE",
                    actual=db_auth.status,
                    evidence=f"Authorization.status == '{db_auth.status}'",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="replay_protection",
                    category="TEMPORAL_OPERATIONAL",
                    status="PASS",
                    reason="Authorization has not been consumed",
                    expected="ACTIVE",
                    actual="ACTIVE",
                    evidence="Authorization.status is ACTIVE",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="replay_protection",
                category="TEMPORAL_OPERATIONAL",
                status="SKIPPED",
                reason="Skipped due to missing Authorization",
                expected="Single-use check",
                actual="N/A",
                evidence="Authorization is None",
            )
        )

    # Check 20: merchant_state_freshness
    stale_hours = get_stale_threshold_hours()
    if db_state:
        if db_state.last_verified_at is None:
            check_results.append(
                CheckResult(
                    check="merchant_state_freshness",
                    category="TEMPORAL_OPERATIONAL",
                    status="FAIL",
                    reason="MerchantState verification timestamp is missing (unverified state)",
                    expected="Valid timestamp",
                    actual="None",
                    evidence="MerchantState.last_verified_at is None",
                )
            )
        else:
            verified_at = db_state.last_verified_at.replace(tzinfo=timezone.utc) if db_state.last_verified_at.tzinfo is None else db_state.last_verified_at
            if verified_at > now_utc + timedelta(minutes=5):
                check_results.append(
                    CheckResult(
                        check="merchant_state_freshness",
                        category="TEMPORAL_OPERATIONAL",
                        status="FAIL",
                        reason=f"MerchantState verification timestamp is in the future ({verified_at})",
                        expected=f"<= {now_utc.isoformat()}",
                        actual=verified_at.isoformat(),
                        evidence="Future timestamp detected",
                    )
                )
            elif (now_utc - verified_at) > timedelta(hours=stale_hours):
                check_results.append(
                    CheckResult(
                        check="merchant_state_freshness",
                        category="TEMPORAL_OPERATIONAL",
                        status="FLAG",
                        reason=f"MerchantState is older than configured threshold ({stale_hours} hours)",
                        expected=f"Age <= {stale_hours}h",
                        actual=f"Age = {(now_utc - verified_at).total_seconds() / 3600:.2f}h",
                        evidence=f"MerchantState verified at {verified_at.isoformat()}",
                    )
                )
            else:
                check_results.append(
                    CheckResult(
                        check="merchant_state_freshness",
                        category="TEMPORAL_OPERATIONAL",
                        status="PASS",
                        reason="MerchantState is fresh",
                        expected=f"Age <= {stale_hours}h",
                        actual=f"Age = {(now_utc - verified_at).total_seconds() / 3600:.2f}h",
                        evidence="MerchantState verified within configured threshold",
                    )
                )
    else:
        check_results.append(
            CheckResult(
                check="merchant_state_freshness",
                category="TEMPORAL_OPERATIONAL",
                status="SKIPPED",
                reason="Skipped due to missing MerchantState",
                expected="Fresh state",
                actual="N/A",
                evidence="MerchantState is None",
            )
        )

    # Check 21: live_price_discrepancy (Exact Proposal Snapshot Association)
    snapshot_price = None
    exact_proposal_id = None
    if db_auth:
        # Find PROPOSAL_APPROVED audit event for this exact authorization
        app_event = (
            db.query(models.AuditEvent)
            .filter(models.AuditEvent.trace_id == db_auth.intent_id)
            .filter(models.AuditEvent.authorization_id == db_auth.id)
            .filter(models.AuditEvent.event_type == "PROPOSAL_APPROVED")
            .first()
        )
        if app_event and app_event.payload:
            try:
                data = json.loads(app_event.payload)
                exact_proposal_id = data.get("proposal_id")
            except json.JSONDecodeError:
                pass

        # If proposal_id found, query exact PROPOSAL_GENERATED event
        if exact_proposal_id:
            gen_events = (
                db.query(models.AuditEvent)
                .filter(models.AuditEvent.trace_id == db_auth.intent_id)
                .filter(models.AuditEvent.event_type == "PROPOSAL_GENERATED")
                .all()
            )
            for gev in gen_events:
                if gev.payload:
                    try:
                        gdata = json.loads(gev.payload)
                        if gdata.get("proposal_id") == exact_proposal_id:
                            snapshot_price = Decimal(str(gdata.get("proposed_price")))
                            break
                    except (json.JSONDecodeError, TypeError):
                        pass

    if db_auth and (snapshot_price is None or exact_proposal_id is None):
        check_results.append(
            CheckResult(
                check="live_price_discrepancy",
                category="TEMPORAL_OPERATIONAL",
                status="FAIL",
                reason="Exact proposal snapshot unresolvable in audit trail",
                expected=f"Valid ProposalSnapshot for Authorization {db_auth.id}",
                actual="None",
                evidence=f"exact_proposal_id={exact_proposal_id}, snapshot_price={snapshot_price}",
            )
        )
    elif db_state and snapshot_price is not None:
        live_price = Decimal(str(db_state.price))
        if live_price != snapshot_price:
            check_results.append(
                CheckResult(
                    check="live_price_discrepancy",
                    category="TEMPORAL_OPERATIONAL",
                    status="FLAG",
                    reason=f"Live merchant unit price ({live_price}) diverges from approved proposal snapshot unit price ({snapshot_price})",
                    expected=str(snapshot_price),
                    actual=str(live_price),
                    evidence=f"Proposal unit price = {snapshot_price}, Live unit price = {live_price}",
                )
            )
        else:
            check_results.append(
                CheckResult(
                    check="live_price_discrepancy",
                    category="TEMPORAL_OPERATIONAL",
                    status="PASS",
                    reason="Live merchant unit price matches approved proposal snapshot unit price",
                    expected=str(snapshot_price),
                    actual=str(live_price),
                    evidence="Live price equals proposal snapshot price",
                )
            )
    else:
        check_results.append(
            CheckResult(
                check="live_price_discrepancy",
                category="TEMPORAL_OPERATIONAL",
                status="SKIPPED",
                reason="Skipped due to missing MerchantState or ProposalSnapshot",
                expected="Price match",
                actual="N/A",
                evidence="MerchantState or Snapshot is None",
            )
        )

    # 4. DECISION PRIORITY AGGREGATION & FAIL-CLOSED SECURITY SEMANTICS
    has_fail = any(c.status == "FAIL" for c in check_results)
    has_skipped = any(c.status == "SKIPPED" for c in check_results)
    has_flag = any(c.status == "FLAG" for c in check_results)

    if has_fail or has_skipped:
        final_decision = "BLOCK"
        failed_checks = [c.check for c in check_results if c.status in ("FAIL", "SKIPPED")]
        reason = f"Verification failed due to hard security violations in checks: {', '.join(failed_checks)}"
    elif has_flag:
        final_decision = "REVIEW"
        flagged_checks = [c.check for c in check_results if c.status == "FLAG"]
        reason = f"Verification requires human review due to operational discrepancies in checks: {', '.join(flagged_checks)}"
    else:
        final_decision = "ALLOW"
        reason = "All 21 authorization, merchant integrity, and operational checks passed cleanly"

    # 5. ATOMIC AUTHORIZATION CONSUMPTION ON ALLOW
    if final_decision == "ALLOW" and db_auth:
        # Atomically consume Authorization status in database
        updated_rows = (
            db.query(models.Authorization)
            .filter(models.Authorization.id == db_auth.id)
            .filter(models.Authorization.status == "ACTIVE")
            .update({"status": "USED"}, synchronize_session=False)
        )
        if updated_rows == 0:
            # Concurrent request consumed authorization between query and commit!
            final_decision = "BLOCK"
            reason = "Replay attack detected: Authorization was consumed by a concurrent request"
            # Update replay_protection check to FAIL
            for c in check_results:
                if c.check == "replay_protection":
                    c.status = "FAIL"
                    c.reason = "Authorization was concurrently consumed by another request"

    # 6. SINGLE-TRANSACTION ATOMIC PERSISTENCE & AUDIT EVENT
    checks_json = json.dumps([c.model_dump() for c in check_results])
    evidence_json = json.dumps({
        "transaction_id": db_txn.id,
        "authorization_id": db_txn.authorization_id,
        "proposal_id": exact_proposal_id,
        "decision": final_decision,
        "checks_count": len(check_results),
        "failed_checks": [c.check for c in check_results if c.status in ("FAIL", "SKIPPED")],
        "flagged_checks": [c.check for c in check_results if c.status == "FLAG"],
    })

    db_verif = models.VerificationResult(
        id=f"VERIF-{uuid.uuid4()}",
        transaction_id=db_txn.id,
        authorization_id=db_txn.authorization_id,
        decision=final_decision,
        reason=reason,
        checks_passed=checks_json,
        evidence=evidence_json,
    )
    db.add(db_verif)

    # Append-only AuditEvent - added to session WITHOUT premature commit to guarantee single DB transaction atomicity
    trace_id = db_auth.intent_id if db_auth else db_txn.id
    db_audit = models.AuditEvent(
        id=models.generate_uuid(),
        trace_id=trace_id,
        event_type="TRANSACTION_VERIFIED",
        authorization_id=db_txn.authorization_id,
        transaction_id=db_txn.id,
        payload=evidence_json,
    )
    db.add(db_audit)

    try:
        db.commit()
        db.refresh(db_verif)
    except IntegrityError:
        db.rollback()
        # Idempotency safety net: if concurrent request created VerificationResult first
        existing_res = (
            db.query(models.VerificationResult)
            .filter(models.VerificationResult.transaction_id == transaction_id)
            .first()
        )
        if existing_res:
            return existing_res
    return db_verif


def resolve_review_transaction(
    db: Session, transaction_id: str, req: schemas.ReviewResolveRequest
) -> models.VerificationResult:
    db_verif = (
        db.query(models.VerificationResult)
        .filter(models.VerificationResult.transaction_id == transaction_id)
        .first()
    )
    if not db_verif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification result not found for transaction",
        )

    if db_verif.decision == "BLOCK":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BLOCK decisions cannot be resolved via review resolution API. Hard security violations require a new authorization contract.",
        )

    if db_verif.decision == "ALLOW":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ALLOW decisions do not require review resolution.",
        )

    if db_verif.decision != "REVIEW":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only REVIEW transactions can be resolved. Current decision: '{db_verif.decision}'",
        )

    db_auth = db.query(models.Authorization).filter(models.Authorization.id == db_verif.authorization_id).first()
    db_txn = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    action_val = getattr(req, "action", "ACCEPT") or "ACCEPT"

    # REJECT flow: Old capability marked REJECTED
    if action_val == "REJECT":
        if db_auth:
            db_auth.status = "REJECTED"
        db_audit = models.AuditEvent(
            id=models.generate_uuid(),
            trace_id=db_verif.authorization_id,
            event_type="REVIEW_RESOLVED",
            authorization_id=db_verif.authorization_id,
            transaction_id=transaction_id,
            payload=json.dumps({
                "transaction_id": transaction_id,
                "original_verification_id": db_verif.id,
                "resolution_reason": req.reason,
                "action": "REJECT",
            }),
        )
        db.add(db_audit)
        db.commit()
        return db_verif

    # ACCEPT flow: Must have valid upstream capability
    if not db_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing upstream authorization for review resolution",
        )

    # 1. Load authoritative live MerchantState from DB (Server truth is authoritative)
    effective_ts = func.coalesce(
        models.MerchantState.last_verified_at, models.MerchantState.created_at
    )
    client_state = (
        db.query(models.MerchantState)
        .filter(models.MerchantState.product_id == db_auth.product_id)
        .order_by(effective_ts.desc(), models.MerchantState.id.desc())
        .first()
    )
    if not client_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No authoritative merchant state found for product",
        )

    authoritative_price = Decimal(str(client_state.price))

    # 2. Validate client accepted_price if provided (Must match server truth)
    if req.accepted_price is not None:
        client_accepted = Decimal(str(req.accepted_price))
        if client_accepted != authoritative_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Client accepted price ({client_accepted}) does not match current authoritative merchant state price ({authoritative_price}). Merchant state cannot be modified via review resolution API.",
            )

    # DO NOT mutate Product.price or MerchantState.price! Merchant state is immutable via review API.

    # 3. SINGLE ATOMIC DATABASE TRANSACTION BOUNDARY FOR ACCEPT:
    # Mark old capability SUPERSEDED
    db_auth.status = "SUPERSEDED"

    # Remove old verification result
    db.delete(db_verif)

    # Mint NEW Intent & Capability using authoritative_price
    new_max_amount = authoritative_price * Decimal(str(db_auth.quantity))
    new_intent_id = f"INT-{str(uuid.uuid4())[:8]}"
    new_intent = models.Intent(
        id=new_intent_id,
        user_id=db_auth.user_id,
        agent_id=db_auth.agent_id,
        raw_prompt="Review Resolution Re-minted Intent",
        action=db_auth.action,
        max_amount=new_max_amount,
        quantity=db_auth.quantity,
        status="REMINTED",
    )
    db.add(new_intent)

    new_auth = models.Authorization(
        id=f"AUTH-{str(uuid.uuid4())[:8]}",
        intent_id=new_intent.id,
        user_id=db_auth.user_id,
        agent_id=db_auth.agent_id,
        merchant_id=db_auth.merchant_id,
        product_id=db_auth.product_id,
        action=db_auth.action,
        quantity=db_auth.quantity,
        max_amount=new_max_amount,
        currency=db_auth.currency,
        allowed_add_ons=db_auth.allowed_add_ons,
        expiry_time=datetime.now(timezone.utc) + timedelta(minutes=15),
        confirmation_required=False,
        status="ACTIVE"
    )
    db.add(new_auth)

    # Create new Transaction linked to new capability (preserves agent_id)
    new_txn = models.Transaction(
        id=f"TXN-{str(uuid.uuid4())[:8]}",
        authorization_id=new_auth.id,
        agent_id=db_txn.agent_id if db_txn else db_auth.agent_id,
        merchant_id=db_auth.merchant_id,
        product_id=db_auth.product_id,
        requested_amount=new_max_amount,
        quantity=db_auth.quantity,
        currency=db_auth.currency,
        add_ons=db_txn.add_ons if db_txn else None
    )
    db.add(new_txn)

    # Flush parents to DB session to satisfy FK constraints before AuditEvents insert
    db.flush()

    # Add Proposal Audit Events for new capability contract
    new_prop_id = f"PROP-{str(uuid.uuid4())[:8]}"
    db_gen = models.AuditEvent(
        id=models.generate_uuid(),
        trace_id=new_intent.id,
        event_type="PROPOSAL_GENERATED",
        authorization_id=None,
        transaction_id=None,
        payload=json.dumps({
            "proposal_id": new_prop_id,
            "intent_id": new_intent.id,
            "product_id": db_auth.product_id,
            "proposed_price": str(authoritative_price),
            "quantity": db_auth.quantity,
        }),
    )
    db.add(db_gen)

    db_app = models.AuditEvent(
        id=models.generate_uuid(),
        trace_id=new_intent.id,
        event_type="PROPOSAL_APPROVED",
        authorization_id=new_auth.id,
        transaction_id=None,
        payload=json.dumps({
            "proposal_id": new_prop_id,
            "intent_id": new_intent.id,
            "decision": "APPROVED",
        }),
    )
    db.add(db_app)

    db_res_audit = models.AuditEvent(
        id=models.generate_uuid(),
        trace_id=db_auth.intent_id,
        event_type="REVIEW_RESOLVED",
        authorization_id=db_auth.id,
        transaction_id=transaction_id,
        payload=json.dumps({
            "transaction_id": transaction_id,
            "resolution_reason": req.reason,
            "action": "ACCEPT",
            "authoritative_price": str(authoritative_price),
            "new_authorization_id": new_auth.id,
        }),
    )
    db.add(db_res_audit)

    # Create new Transaction linked to new capability (preserves agent_id)
    new_txn = models.Transaction(
        id=f"TXN-{str(uuid.uuid4())[:8]}",
        authorization_id=new_auth.id,
        agent_id=db_txn.agent_id if db_txn else db_auth.agent_id,
        merchant_id=db_auth.merchant_id,
        product_id=db_auth.product_id,
        requested_amount=new_max_amount,
        quantity=db_auth.quantity,
        currency=db_auth.currency,
        add_ons=db_txn.add_ons if db_txn else None
    )
    db.add(new_txn)

    # SINGLE COMMIT FOR THE ENTIRE ACCEPT WORKFLOW
    db.commit()

    # Re-verify new transaction
    return verify_transaction_by_id(db=db, transaction_id=new_txn.id)
