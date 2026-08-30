from enum import Enum
from typing import List, Dict, Any, Optional
from decimal import Decimal
from app.services.ai_buyer_interface import AIBuyerAdapter


class MockAIBuyerMode(str, Enum):
    LEGITIMATE = "LEGITIMATE"
    ATTACK_PRICE_ESCALATION = "ATTACK_PRICE_ESCALATION"
    ATTACK_PRODUCT_SUBSTITUTION = "ATTACK_PRODUCT_SUBSTITUTION"
    ATTACK_MERCHANT_SUBSTITUTION = "ATTACK_MERCHANT_SUBSTITUTION"
    ATTACK_AGENT_DELEGATION = "ATTACK_AGENT_DELEGATION"
    ATTACK_SUBDIVISION_REPLAY = "ATTACK_SUBDIVISION_REPLAY"
    REVIEW_ACCEPTANCE = "REVIEW_ACCEPTANCE"


class MockAIBuyerAdapter(AIBuyerAdapter):
    """
    Deterministic Mock AI Buyer Agent supporting both legitimate e-commerce workflows
    and simulated adversarial attack vectors to demonstrate IntentLock enforcement.
    """

    def __init__(
        self,
        mode: MockAIBuyerMode = MockAIBuyerMode.LEGITIMATE,
        override_agent_id: Optional[str] = None,
        override_merchant_id: Optional[str] = None,
        override_product_id: Optional[str] = None,
    ):
        self.mode = mode
        self.override_agent_id = override_agent_id
        self.override_merchant_id = override_merchant_id
        self.override_product_id = override_product_id

    def discover_products(
        self, client: Any, query: str, max_price: Optional[Decimal] = None
    ) -> List[Dict[str, Any]]:
        params = {"q": query}
        if max_price is not None:
            params["max_price"] = str(max_price)
        res = client.get("/catalog/products", params=params)
        if res.status_code == 200:
            return res.json()
        return []

    def select_product(
        self, query: str, catalog: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        if not catalog:
            return None
        # Select first available item matching query
        for item in catalog:
            if item.get("is_available", True):
                return item
        return catalog[0]

    def generate_proposal(
        self, client: Any, intent_id: str, product_id: str, quantity: int = 1
    ) -> Dict[str, Any]:
        res = client.post(
            "/intent/workflow/proposal",
            json={
                "intent_id": intent_id,
                "product_id": product_id,
                "quantity": quantity
            }
        )
        if res.status_code in (200, 201):
            return res.json()
        raise ValueError(f"Proposal generation failed: {res.text}")

    def construct_transaction(
        self,
        authorization_id: str,
        agent_id: str,
        merchant_id: str,
        product_id: str,
        amount: Decimal,
        quantity: int = 1,
        currency: str = "INR",
        add_ons: Optional[str] = None
    ) -> Dict[str, Any]:
        
        tx_agent_id = self.override_agent_id if (self.mode == MockAIBuyerMode.ATTACK_AGENT_DELEGATION and self.override_agent_id) else agent_id
        tx_merchant_id = self.override_merchant_id if (self.mode == MockAIBuyerMode.ATTACK_MERCHANT_SUBSTITUTION and self.override_merchant_id) else merchant_id
        tx_product_id = self.override_product_id if (self.mode == MockAIBuyerMode.ATTACK_PRODUCT_SUBSTITUTION and self.override_product_id) else product_id
        tx_amount = str(amount)
        tx_quantity = quantity
        tx_currency = currency
        tx_addons = add_ons

        # Attack Mode Mutations
        if self.mode == MockAIBuyerMode.ATTACK_PRICE_ESCALATION:
            # Inflate amount above authorized max_amount
            tx_amount = str(amount + Decimal("1000.00"))

        elif self.mode == MockAIBuyerMode.ATTACK_PRODUCT_SUBSTITUTION and not self.override_product_id:
            tx_product_id = "PROD-ATTACKER-SUBSTITUTE"

        elif self.mode == MockAIBuyerMode.ATTACK_MERCHANT_SUBSTITUTION and not self.override_merchant_id:
            tx_merchant_id = "MERCH-ATTACKER-SUBSTITUTE"

        elif self.mode == MockAIBuyerMode.ATTACK_AGENT_DELEGATION and not self.override_agent_id:
            tx_agent_id = "AGENT-ATTACKER-DELEGATE-B"

        return {
            "authorization_id": authorization_id,
            "agent_id": tx_agent_id,
            "merchant_id": tx_merchant_id,
            "product_id": tx_product_id,
            "requested_amount": tx_amount,
            "quantity": tx_quantity,
            "currency": tx_currency,
            "add_ons": tx_addons
        }
