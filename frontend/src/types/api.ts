export interface ProductCatalogItem {
  id: string;
  merchant_id: string;
  sku: string;
  name: string;
  category: string;
  base_price: string;
  authoritative_price: string;
  inventory: number;
  is_available: boolean;
  offer_status: string;
  last_verified_at: string | null;
}

export interface ProposalSnapshot {
  proposal_id: string;
  intent_id: string;
  product_id: string;
  merchant_id: string;
  proposed_price: string;
  quantity: number;
  total_proposed_amount: string;
  created_at: string;
}

export interface AuthorizationContract {
  id: string;
  intent_id: string;
  user_id: string;
  agent_id: string;
  max_amount: string;
  status: 'ACTIVE' | 'USED' | 'SUPERSEDED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
}

export interface VerificationCheckDetail {
  code: string;
  name: string;
  category: string;
  passed: boolean;
  description: string;
}

export interface VerificationResult {
  id: string;
  transaction_id: string;
  authorization_id: string;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reason: string;
  checks_evaluated: number;
  checks_passed: number;
  created_at: string;
}

export interface PaymentOrder {
  id: string;
  transaction_id: string;
  verification_id: string;
  authorization_id: string;
  razorpay_order_id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  trace_id: string;
  event_type: string;
  authorization_id: string | null;
  transaction_id: string | null;
  payload: string;
  previous_hash: string | null;
  hash: string;
  timestamp: string;
}
