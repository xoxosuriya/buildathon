import { ProductCatalogItem, ProposalSnapshot, AuthorizationContract, VerificationCheckDetail, VerificationResult, PaymentOrder, AuditEvent } from '../types/api';

export const MOCK_PRODUCTS: ProductCatalogItem[] = [
  {
    id: "prod_1",
    merchant_id: "merch_techzone",
    sku: "MOUSE-ERG-01",
    name: "Wireless Ergonomic Mouse",
    category: "Peripherals",
    base_price: "1200.00",
    authoritative_price: "1200.00",
    inventory: 14,
    is_available: true,
    offer_status: "ACTIVE",
    last_verified_at: new Date().toISOString()
  },
  {
    id: "prod_2",
    merchant_id: "merch_techzone",
    sku: "KBD-MECH-87",
    name: "Tenkeyless Mechanical Keyboard",
    category: "Peripherals",
    base_price: "3500.00",
    authoritative_price: "3500.00",
    inventory: 5,
    is_available: true,
    offer_status: "ACTIVE",
    last_verified_at: new Date().toISOString()
  }
];

export const MOCK_PROPOSALS: ProposalSnapshot[] = [
  {
    proposal_id: "prop_legit_94a1",
    intent_id: "intent_purchase_mouse",
    product_id: "prod_1",
    merchant_id: "merch_techzone",
    proposed_price: "1200.00",
    quantity: 1,
    total_proposed_amount: "1200.00",
    created_at: new Date().toISOString()
  },
  {
    proposal_id: "prop_attack_58b2",
    intent_id: "intent_purchase_mouse",
    product_id: "prod_1",
    merchant_id: "merch_techzone",
    proposed_price: "2500.00",
    quantity: 1,
    total_proposed_amount: "2500.00",
    created_at: new Date().toISOString()
  }
];

export const MOCK_AUTHORIZATIONS: AuthorizationContract[] = [
  {
    id: "auth_legit_82f",
    intent_id: "intent_purchase_mouse",
    user_id: "user_demo_01",
    agent_id: "agent_shopping_buddy",
    max_amount: "1200.00",
    status: "ACTIVE",
    created_at: new Date().toISOString()
  },
  {
    id: "auth_consumed_90d",
    intent_id: "intent_purchase_mouse",
    user_id: "user_demo_01",
    agent_id: "agent_shopping_buddy",
    max_amount: "1200.00",
    status: "USED",
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export const MOCK_VERIFICATION_CHECKS: VerificationCheckDetail[] = [
  { code: "CHK-01", name: "Authorization Record Exists", category: "Authorization", passed: true, description: "Verifies the capability contract exists in the database." },
  { code: "CHK-02", name: "Authorization Status Active", category: "Authorization", passed: true, description: "Verifies the capability contract is not consumed or expired." },
  { code: "CHK-03", name: "Authorization Not Expired", category: "Authorization", passed: true, description: "Verifies the capability contract is within its validity period." },
  { code: "CHK-04", name: "User Intent ID Match", category: "Authorization", passed: true, description: "Verifies transaction intent ID matches user intent ID." },
  { code: "CHK-05", name: "Agent Non-Delegation Match", category: "Agent", passed: true, description: "Verifies the executing agent matches the authorized agent." },
  { code: "CHK-06", name: "Merchant Entity ID Match", category: "Merchant", passed: true, description: "Verifies merchant matches the authorized merchant." },
  { code: "CHK-07", name: "Product Entity ID Match", category: "Product", passed: true, description: "Verifies the target product ID matches the authorized product ID." },
  { code: "CHK-08", name: "Amount Within Bounded Limit", category: "Authorization", passed: true, description: "Verifies transaction amount does not exceed capability max amount." },
  { code: "CHK-09", name: "Quantity Within Bounded Limit", category: "Authorization", passed: true, description: "Verifies product quantity is within authorized parameters." },
  { code: "CHK-10", name: "Currency ISO Strict Match", category: "Authorization", passed: true, description: "Verifies transaction currency matches capability currency limit." },
  { code: "CHK-11", name: "Add-Ons Scope Check", category: "Product", passed: true, description: "Verifies extra charges or add-ons fall within authorization limits." },
  { code: "CHK-12", name: "Merchant Status Active", category: "Merchant", passed: true, description: "Verifies the merchant is active and certified in the registry." },
  { code: "CHK-13", name: "Product Active Status True", category: "Product", passed: true, description: "Verifies the target product is active and listed for sale." },
  { code: "CHK-14", name: "Product-Merchant Hierarchy", category: "Product", passed: true, description: "Verifies the product belongs directly to the target merchant." },
  { code: "CHK-15", name: "MerchantState Exists", category: "Merchant", passed: true, description: "Verifies the state schema for the merchant exists." },
  { code: "CHK-16", name: "MerchantState Available", category: "Merchant", passed: true, description: "Verifies state sync is online and active." },
  { code: "CHK-17", name: "Inventory Sufficient", category: "Merchant", passed: true, description: "Verifies that merchant inventory can fulfill the order." },
  { code: "CHK-18", name: "Timestamp Staleness Check", category: "Operational", passed: true, description: "Verifies timestamps are fresh (no network delays/replay delay)." },
  { code: "CHK-19", name: "Live Merchant Price Discrepancy", category: "Operational", passed: true, description: "Compares live merchant price with signed proposal price." },
  { code: "CHK-20", name: "Proposal Snapshot Integrity", category: "Operational", passed: true, description: "Checks cryptographic checksum of proposal snapshot." },
  { code: "CHK-21", name: "Replay Protection Lock", category: "Operational", passed: true, description: "Atomic execution lock prevents double-submission." }
];

export const MOCK_VERIFICATION_RESULTS: Record<string, VerificationResult> = {
  legitimate: {
    id: "vr_legit_101",
    transaction_id: "txn_legit_201",
    authorization_id: "auth_legit_82f",
    decision: "ALLOW",
    reason: "All 21 verification checks passed cleanly. No delegation or price anomalies found.",
    checks_evaluated: 21,
    checks_passed: 21,
    created_at: new Date().toISOString()
  },
  price_attack: {
    id: "vr_attack_102",
    transaction_id: "txn_attack_202",
    authorization_id: "auth_legit_82f",
    decision: "BLOCK",
    reason: "CHK-08 (Amount Within Bounded Limit) Failed: Requested amount of ₹2,500.00 exceeds capability limit of ₹1,200.00.",
    checks_evaluated: 21,
    checks_passed: 20,
    created_at: new Date().toISOString()
  },
  delegation_attack: {
    id: "vr_attack_103",
    transaction_id: "txn_attack_203",
    authorization_id: "auth_legit_82f",
    decision: "BLOCK",
    reason: "CHK-05 (Agent Non-Delegation Match) Failed: Request submitted by Agent-B. Authorization is bound to Agent-A and is non-delegable.",
    checks_evaluated: 21,
    checks_passed: 20,
    created_at: new Date().toISOString()
  },
  replay_attack: {
    id: "vr_attack_104",
    transaction_id: "txn_attack_204",
    authorization_id: "auth_consumed_90d",
    decision: "BLOCK",
    reason: "CHK-02 (Authorization Status Active) and CHK-21 (Replay Protection Lock) Failed: The capability contract has already been spent in txn_legit_201.",
    checks_evaluated: 21,
    checks_passed: 19,
    created_at: new Date().toISOString()
  },
  price_drift: {
    id: "vr_drift_105",
    transaction_id: "txn_drift_205",
    authorization_id: "auth_legit_82f",
    decision: "REVIEW",
    reason: "CHK-19 (Live Merchant Price Discrepancy) Flagged: Merchant price has drifted from ₹1,200.00 to ₹1,400.00 after approval.",
    checks_evaluated: 21,
    checks_passed: 20,
    created_at: new Date().toISOString()
  }
};

export const MOCK_ORDERS: PaymentOrder[] = [
  {
    id: "ord_rzp_legit_9d0",
    transaction_id: "txn_legit_201",
    verification_id: "vr_legit_101",
    authorization_id: "auth_legit_82f",
    razorpay_order_id: "order_test_rzp_9d0eed64",
    amount: "1200.00",
    currency: "INR",
    status: "CREATED",
    created_at: new Date().toISOString()
  }
];

export const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "ae_1",
    trace_id: "trc_94a1",
    event_type: "PROPOSAL_GENERATED",
    authorization_id: null,
    transaction_id: null,
    payload: '{"proposal_id":"prop_legit_94a1","item":"Wireless Ergonomic Mouse","proposed_price":"1200.00"}',
    previous_hash: null,
    hash: "ca0987522c781631e847b2c9d1a3e5f78239014561",
    timestamp: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: "ae_2",
    trace_id: "trc_94a1",
    event_type: "PROPOSAL_APPROVED",
    authorization_id: null,
    transaction_id: null,
    payload: '{"proposal_id":"prop_legit_94a1","user_id":"user_demo_01"}',
    previous_hash: "ca0987522c781631e847b2c9d1a3e5f78239014561",
    hash: "7881cdebceec0293781290348712958210398401928",
    timestamp: new Date(Date.now() - 240000).toISOString()
  },
  {
    id: "ae_3",
    trace_id: "trc_94a1",
    event_type: "AUTHORIZATION_CREATED",
    authorization_id: "auth_legit_82f",
    transaction_id: null,
    payload: '{"authorization_id":"auth_legit_82f","max_amount":"1200.00","agent_id":"agent_shopping_buddy"}',
    previous_hash: "7881cdebceec0293781290348712958210398401928",
    hash: "b44f45ad79d27d20918237498172938172938172938",
    timestamp: new Date(Date.now() - 180000).toISOString()
  },
  {
    id: "ae_4",
    trace_id: "trc_94a1",
    event_type: "TRANSACTION_VERIFIED",
    authorization_id: "auth_legit_82f",
    transaction_id: "txn_legit_201",
    payload: '{"verification_result":"ALLOW","checked_rules":21}',
    previous_hash: "b44f45ad79d27d20918237498172938172938172938",
    hash: "be7dec69c6891497129837129837129837129837129",
    timestamp: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: "ae_5",
    trace_id: "trc_94a1",
    event_type: "CAPABILITY_CONSUMED",
    authorization_id: "auth_legit_82f",
    transaction_id: "txn_legit_201",
    payload: '{"authorization_id":"auth_legit_82f","status":"USED"}',
    previous_hash: "be7dec69c6891497129837129837129837129837129",
    hash: "56a27c476933f2ad918237198237192837192837192",
    timestamp: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: "ae_6",
    trace_id: "trc_94a1",
    event_type: "PAYMENT_EXECUTED",
    authorization_id: "auth_legit_82f",
    transaction_id: "txn_legit_201",
    payload: '{"razorpay_order_id":"order_test_rzp_9d0eed64","status":"PAID"}',
    previous_hash: "56a27c476933f2ad918237198237192837192837192",
    hash: "8bdab680943c9369192837192837192837192837192",
    timestamp: new Date().toISOString()
  }
];
