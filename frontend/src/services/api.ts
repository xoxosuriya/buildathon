import {
  ProductCatalogItem,
  ProposalSnapshot,
  AuthorizationContract,
  VerificationResult,
  PaymentOrder,
  AuditEvent,
  DemoScenarioResponse
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `API HTTP ${res.status}`);
  }

  return res.json();
}

export const apiService = {
  // Check backend health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      return res.status === 200;
    } catch {
      return false;
    }
  },

  // Catalog search
  async getCatalogProducts(query: string = 'wireless'): Promise<ProductCatalogItem[]> {
    try {
      return await fetchJSON<ProductCatalogItem[]>(`/catalog/products?q=${encodeURIComponent(query)}`);
    } catch (e) {
      // Return fallback product catalog item
      return [{
        id: "PROD-MOUSE-01",
        merchant_id: "MERCH-TECHZONE-01",
        sku: "SKU-MOUSE-ERG",
        name: "Wireless Ergonomic Mouse",
        category: "ELECTRONICS",
        base_price: "1200.00",
        authoritative_price: "1200.00",
        inventory: 15,
        is_available: true,
        offer_status: "ACTIVE",
        last_verified_at: new Date().toISOString()
      }];
    }
  },

  // Create Intent
  async createIntent(payload: {
    user_id?: string;
    agent_id?: string;
    raw_prompt: string;
    action: string;
    max_amount: string;
    quantity?: number;
    category?: string;
  }): Promise<{ id: string; user_id: string; agent_id: string; max_amount: string; status: string }> {
    return fetchJSON<{ id: string; user_id: string; agent_id: string; max_amount: string; status: string }>('/intent', {
      method: 'POST',
      body: JSON.stringify({
        user_id: payload.user_id || 'USER-DEFAULT',
        agent_id: payload.agent_id || 'AGENT-DEFAULT',
        raw_prompt: payload.raw_prompt,
        action: payload.action,
        max_amount: payload.max_amount,
        quantity: payload.quantity || 1,
        category: payload.category || 'ELECTRONICS'
      })
    });
  },

  // Create Intent & Proposal
  async createProposal(intentId: string, productId: string, quantity: number = 1): Promise<ProposalSnapshot> {
    return fetchJSON<ProposalSnapshot>('/intent/workflow/proposal', {
      method: 'POST',
      body: JSON.stringify({ intent_id: intentId, product_id: productId, quantity })
    });
  },

  // Approve Intent -> Mint Authorization
  async approveProposal(proposalId: string, intentId: string): Promise<AuthorizationContract> {
    return fetchJSON<AuthorizationContract>('/intent/workflow/approve', {
      method: 'POST',
      body: JSON.stringify({ proposal_id: proposalId, intent_id: intentId, decision: 'APPROVED' })
    });
  },

  // Submit Transaction
  async createTransaction(payload: {
    authorization_id: string;
    agent_id: string;
    merchant_id: string;
    product_id: string;
    requested_amount: string;
    quantity: number;
    currency?: string;
  }) {
    return fetchJSON<{ id: string; status: string }>('/transaction', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Verify Transaction
  async verifyTransaction(transactionId: string): Promise<VerificationResult> {
    return fetchJSON<VerificationResult>(`/verify/${transactionId}`, {
      method: 'POST'
    });
  },

  // Evaluate Demo Scenario (Section 6 Real Backend Gateway)
  async evaluateDemoScenario(intentType: string = 'buy', scenario: string = 'normal'): Promise<DemoScenarioResponse> {
    return fetchJSON<DemoScenarioResponse>('/verify/demo-scenario/evaluate', {
      method: 'POST',
      body: JSON.stringify({ intent_type: intentType, scenario })
    });
  },

  // Resolve Review
  async resolveReview(transactionId: string, acceptedPrice: string): Promise<VerificationResult> {
    return fetchJSON<VerificationResult>(`/verify/${transactionId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        reason: "User accepts updated merchant price",
        action: "ACCEPT",
        accepted_price: acceptedPrice
      })
    });
  },

  // Execute Razorpay Test Payment
  async executePayment(transactionId: string, verificationId: string): Promise<PaymentOrder> {
    return fetchJSON<PaymentOrder>('/payment/execute', {
      method: 'POST',
      body: JSON.stringify({ transaction_id: transactionId, verification_id: verificationId })
    });
  },

  // Fetch Audit Trail Events
  async getAuditEvents(): Promise<AuditEvent[]> {
    try {
      return await fetchJSON<AuditEvent[]>('/audit/events');
    } catch {
      return [];
    }
  }
};

