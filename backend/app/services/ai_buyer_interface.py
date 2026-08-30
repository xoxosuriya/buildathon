from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from decimal import Decimal


class AIBuyerAdapter(ABC):
    """
    Abstract interface for AI Buyer Agents.
    Enforces that AI reasoning, search, and proposal generation occur strictly
    outside payment enforcement boundaries. The AI Buyer CANNOT authorize
    payments or decide verification decisions.
    """

    @abstractmethod
    def discover_products(
        self, client: Any, query: str, max_price: Optional[Decimal] = None
    ) -> List[Dict[str, Any]]:
        """
        Discover active merchant products from the Catalog API.
        """
        pass

    @abstractmethod
    def select_product(
        self, query: str, catalog: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Reason and select the best product matching the user prompt.
        """
        pass

    @abstractmethod
    def generate_proposal(
        self, client: Any, intent_id: str, product_id: str, quantity: int = 1
    ) -> Dict[str, Any]:
        """
        Create a purchase proposal snapshot for user approval.
        """
        pass

    @abstractmethod
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
        """
        Construct a transaction payload to submit to IntentLock.
        """
        pass
