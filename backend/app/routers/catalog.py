from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/catalog", tags=["Catalog"])


@router.get("/merchants", response_model=List[schemas.MerchantResponse])
def list_merchants(
    status_filter: str = "ACTIVE",
    db: Session = Depends(get_db)
):
    """
    List merchants matching the specified status.
    """
    query = db.query(models.Merchant)
    if status_filter:
        query = query.filter(models.Merchant.status == status_filter)
    return query.all()


@router.get("/products")
def search_products(
    q: Optional[str] = Query(None, description="Search query string"),
    category: Optional[str] = Query(None, description="Product category"),
    merchant_id: Optional[str] = Query(None, description="Merchant ID"),
    min_price: Optional[Decimal] = Query(None, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, description="Maximum price"),
    db: Session = Depends(get_db)
):
    """
    Search and filter products along with their authoritative live MerchantState.
    """
    query = db.query(models.Product).filter(models.Product.is_active == True)
    
    if q:
        query = query.filter(
            (models.Product.name.ilike(f"%{q}%")) | 
            (models.Product.category.ilike(f"%{q}%")) |
            (models.Product.sku.ilike(f"%{q}%"))
        )
    if category:
        query = query.filter(models.Product.category.ilike(f"%{category}%"))
    if merchant_id:
        query = query.filter(models.Product.merchant_id == merchant_id)
        
    products = query.all()
    results = []
    
    for p in products:
        # Load authoritative latest MerchantState
        effective_ts = func.coalesce(models.MerchantState.last_verified_at, models.MerchantState.created_at)
        ms = (
            db.query(models.MerchantState)
            .filter(models.MerchantState.product_id == p.id)
            .order_by(effective_ts.desc(), models.MerchantState.id.desc())
            .first()
        )
        
        current_price = ms.price if ms else p.price
        
        # Apply min/max price filters based on authoritative price
        if min_price is not None and current_price < min_price:
            continue
        if max_price is not None and current_price > max_price:
            continue
            
        results.append({
            "id": p.id,
            "merchant_id": p.merchant_id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "base_price": str(p.price),
            "authoritative_price": str(current_price),
            "inventory": ms.inventory if ms else 0,
            "is_available": ms.is_available if ms else False,
            "offer_status": ms.offer_status if ms else "UNKNOWN",
            "last_verified_at": ms.last_verified_at.isoformat() if ms and ms.last_verified_at else None
        })
        
    return results


@router.get("/products/{product_id}")
def get_product_detail(product_id: str, db: Session = Depends(get_db)):
    """
    Get single product details with authoritative MerchantState.
    """
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found"
        )
        
    effective_ts = func.coalesce(models.MerchantState.last_verified_at, models.MerchantState.created_at)
    ms = (
        db.query(models.MerchantState)
        .filter(models.MerchantState.product_id == p.id)
        .order_by(effective_ts.desc(), models.MerchantState.id.desc())
        .first()
    )
    
    m = db.query(models.Merchant).filter(models.Merchant.id == p.merchant_id).first()
    
    return {
        "id": p.id,
        "merchant_id": p.merchant_id,
        "merchant_name": m.name if m else "Unknown Merchant",
        "sku": p.sku,
        "name": p.name,
        "category": p.category,
        "base_price": str(p.price),
        "authoritative_price": str(ms.price) if ms else str(p.price),
        "inventory": ms.inventory if ms else 0,
        "is_available": ms.is_available if ms else False,
        "offer_status": ms.offer_status if ms else "UNKNOWN",
        "last_verified_at": ms.last_verified_at.isoformat() if ms and ms.last_verified_at else None
    }
