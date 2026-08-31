import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Zap,
  DollarSign,
  Package,
  Store,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { AuthorizationContract, VerificationResult, PaymentOrder } from '../../types/api';

type MutationType = 'normal' | 'price_escalation' | 'product_mismatch' | 'unauthorized_merchant';

export function ProductWorkflowSection() {
  // Workflow State
  const [activeTab, setActiveTab] = useState<'buy' | 'book' | 'payment'>('buy');
  const [mutation, setMutation] = useState<MutationType>('normal');

  // Backend Pipeline Data States
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeIntentId, setActiveIntentId] = useState<string | null>(null);
  const [authorization, setAuthorization] = useState<AuthorizationContract | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);

  // Preset Configurations for Intent Creation
  const CONFIGS = {
    buy: {
      action: 'PURCHASE',
      prompt: 'Purchase one wireless ergonomic mouse under ₹1,500.',
      maxAmount: '1500.00',
      formattedMax: '₹1,500.00',
      productName: 'Wireless Ergonomic Mouse',
      productId: 'PROD-MOUSE-01',
      merchantName: 'Authorized TechZone Merchant',
      merchantId: 'MERCH-TECHZONE-01',
      normalAmount: '1200.00',
      formattedNormal: '₹1,200.00',
      escalatedAmount: '1850.00',
      formattedEscalated: '₹1,850.00',
    },
    book: {
      action: 'BOOK',
      prompt: 'Book a deluxe hotel suite under ₹5,000/night.',
      maxAmount: '5000.00',
      formattedMax: '₹5,000.00',
      productName: 'Deluxe Hotel Suite',
      productId: 'PROD-HOTEL-01',
      merchantName: 'Grand Plaza Hotel',
      merchantId: 'MERCH-HOTEL-01',
      normalAmount: '4800.00',
      formattedNormal: '₹4,800.00',
      escalatedAmount: '6200.00',
      formattedEscalated: '₹6,200.00',
    },
    payment: {
      action: 'PAY',
      prompt: 'Pay monthly SaaS cloud infrastructure invoice under ₹10,000.',
      maxAmount: '10000.00',
      formattedMax: '₹10,000.00',
      productName: 'SaaS Cloud Subscription',
      productId: 'PROD-SAAS-01',
      merchantName: 'SaaS Cloud Inc.',
      merchantId: 'MERCH-SAAS-01',
      normalAmount: '8500.00',
      formattedNormal: '₹8,500.00',
      escalatedAmount: '12500.00',
      formattedEscalated: '₹12,500.00',
    },
  };

  const currentCfg = CONFIGS[activeTab];

  const parseError = (err: any): string => {
    if (typeof err === 'string') return err;
    if (err?.response?.data?.detail) {
      if (typeof err.response.data.detail === 'string') return err.response.data.detail;
      return JSON.stringify(err.response.data.detail);
    }
    if (err?.message) return err.message;
    return 'An unexpected error occurred during backend verification.';
  };

  const handleReset = () => {
    setActiveIntentId(null);
    setAuthorization(null);
    setTransactionId(null);
    setVerificationResult(null);
    setPaymentOrder(null);
    setError(null);
    setMutation('normal');
  };

  // STEP 1 -> 2: Mint Authorization Contract on FastAPI Backend
  const handleMintAuthorization = async () => {
    setIsMinting(true);
    setError(null);
    setVerificationResult(null);
    setPaymentOrder(null);

    try {
      const intentRes = await apiService.createIntent({
        raw_prompt: currentCfg.prompt,
        action: currentCfg.action,
        max_amount: currentCfg.maxAmount,
        user_id: 'USER-DEFAULT',
      });
      setActiveIntentId(intentRes.id);

      const propRes = await apiService.createProposal(intentRes.id, currentCfg.productId, 1);

      const authRes = await apiService.approveProposal(propRes.proposal_id, intentRes.id);
      setAuthorization(authRes);
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsMinting(false);
    }
  };

  // STEP 3 -> 4: Submit AI Agent Action & Run 21-Check Verification Engine
  const handleExecuteAgentAction = async () => {
    if (!authorization) return;
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      let requestedAmount = currentCfg.normalAmount;
      let targetMerchant = authorization.merchant_id || currentCfg.merchantId;
      let targetProduct = authorization.product_id || currentCfg.productId;

      if (mutation === 'price_escalation') {
        requestedAmount = currentCfg.escalatedAmount;
      } else if (mutation === 'product_mismatch') {
        targetProduct = 'PROD-UNAPPROVED-SUB';
      } else if (mutation === 'unauthorized_merchant') {
        targetMerchant = 'MERCH-UNVERIFIED-MARKETPLACE';
      }

      const txRes = await apiService.createTransaction({
        authorization_id: authorization.id,
        agent_id: authorization.agent_id || 'AGENT-DEFAULT',
        merchant_id: targetMerchant,
        product_id: targetProduct,
        requested_amount: requestedAmount,
        quantity: 1,
        currency: 'INR',
      });
      setTransactionId(txRes.id);

      const verifRes = await apiService.verifyTransaction(txRes.id);
      setVerificationResult(verifRes);

      if (verifRes.decision === 'ALLOW') {
        try {
          const orderRes = await apiService.executePayment(txRes.id, verifRes.id);
          setPaymentOrder(orderRes);
        } catch {
          // Payment order execution optional fallback
        }
      } else {
        setPaymentOrder(null);
      }
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // Replay Attack Test
  const handleReplayAttack = async () => {
    if (!authorization) return;
    setIsReplaying(true);
    setError(null);

    try {
      const txRes = await apiService.createTransaction({
        authorization_id: authorization.id,
        agent_id: authorization.agent_id || 'AGENT-DEFAULT',
        merchant_id: authorization.merchant_id || currentCfg.merchantId,
        product_id: authorization.product_id || currentCfg.productId,
        requested_amount: currentCfg.normalAmount,
        quantity: 1,
        currency: 'INR',
      });
      setTransactionId(txRes.id);

      const verifRes = await apiService.verifyTransaction(txRes.id);
      setVerificationResult(verifRes);
      setPaymentOrder(null);
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <section
      id="live-demo"
      className="relative w-full min-h-screen bg-[#F7F7F9] text-neutral-900 font-sans antialiased px-4 sm:px-6 md:px-10 lg:px-14 py-20 sm:py-24 flex flex-col justify-center items-center selection:bg-neutral-200"
    >
      <div className="max-w-5xl mx-auto relative z-10 w-full flex flex-col items-center text-center">
        
        {/* Section Header */}
        <p className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-neutral-500 uppercase mb-3 font-sans">
          REAL APPLICATION WORKFLOW
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[48px] leading-[1.12] font-light tracking-tight text-neutral-900 mb-4 font-sans max-w-4xl"
        >
          Execute a live Intent-Bound Transaction.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base sm:text-lg text-neutral-600 font-normal mb-8 sm:mb-10 max-w-2xl font-sans"
        >
          Define your intent, mint an enforceable authorization on the live FastAPI backend, submit an agent action, and let the 21-check engine enforce boundaries.
        </motion.p>

        {/* ── STEP 1: USER DEFINES INTENT ── */}
        <div className="w-full max-w-4xl mb-8 space-y-4">
          <div className="flex flex-wrap lg:flex-nowrap justify-center items-center gap-2 sm:gap-3 w-full">
            {(['buy', 'book', 'payment'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  handleReset();
                }}
                className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-sans font-medium tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border whitespace-nowrap shrink-0 ${
                  activeTab === tab
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-md font-semibold'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400 hover:text-neutral-900 shadow-sm'
                }`}
              >
                {tab === 'buy' && <Package className="h-4 w-4 stroke-[1.5] text-current" />}
                {tab === 'book' && <Store className="h-4 w-4 stroke-[1.5] text-current" />}
                {tab === 'payment' && <CreditCard className="h-4 w-4 stroke-[1.5] text-current" />}
                <span className="uppercase">{tab === 'buy' ? 'BUY SOMETHING' : tab === 'book' ? 'BOOK SOMETHING' : 'MAKE A PAYMENT'}</span>
              </button>
            ))}
          </div>

          {/* STEP 1 Box */}
          <div className="rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-8 text-left relative overflow-hidden shadow-xl space-y-4 text-neutral-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] font-sans font-semibold text-neutral-500 uppercase tracking-widest block">
                  STEP 1 — DEFINE INTENT
                </span>
                <h3 className="text-base sm:text-lg font-sans font-bold text-neutral-900 mt-0.5">
                  "{currentCfg.prompt}"
                </h3>
              </div>

              <button
                onClick={handleMintAuthorization}
                disabled={isMinting}
                className="px-5 py-2.5 rounded-full bg-neutral-900 text-white font-sans font-semibold text-xs sm:text-sm hover:bg-neutral-800 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 shadow-md"
              >
                <Lock className="h-4 w-4 stroke-[1.5]" />
                <span>{isMinting ? 'MINTING AUTHORIZATION...' : 'MINT AUTHORIZATION CONTRACT'}</span>
              </button>
            </div>

            {/* Intent Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-700">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-sans font-semibold">Action</span>
                <span className="font-sans font-bold text-neutral-900">{currentCfg.action}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-sans font-semibold">Maximum Amount</span>
                <span className="font-sans font-bold text-emerald-700">{currentCfg.formattedMax}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-sans font-semibold">Target Merchant</span>
                <span className="font-sans font-bold text-neutral-900">{currentCfg.merchantName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-sans font-semibold">Contract Scope</span>
                <span className="font-sans font-bold text-emerald-700">Single-use · Non-Delegable</span>
              </div>
            </div>

            {/* STEP 2: AUTHORIZATION ACTIVE STATE (FROM BACKEND) */}
            {authorization && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 sm:p-5 font-sans text-xs space-y-2 mt-4 text-emerald-950"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs tracking-wide">
                    <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />
                    <span>STEP 2 — AUTHORIZATION ACTIVE (MINTED IN SQLITE DB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
                      State: {authorization.status}
                    </span>
                    <span className="text-[10px] font-sans text-emerald-700 font-medium">
                      ID: {authorization.id}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-emerald-900">
                  <div>
                    <span className="text-emerald-700/80 block text-[10px] uppercase font-sans font-semibold">Authorization ID</span>
                    <span className="font-sans text-[11px] text-emerald-950 font-bold">{authorization.id}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700/80 block text-[10px] uppercase font-sans font-semibold">Intent ID</span>
                    <span className="font-sans text-[11px] text-emerald-950 font-bold">{activeIntentId || authorization.intent_id}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700/80 block text-[10px] uppercase font-sans font-semibold">Max Bounded Limit</span>
                    <span className="font-sans font-bold text-emerald-800">{currentCfg.formattedMax}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700/80 block text-[10px] uppercase font-sans font-semibold">Backend Provenance</span>
                    <span className="font-sans text-[11px] text-emerald-800 font-medium">FastAPI · SQLite DB</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── STEP 3: AI AGENT PROPOSED ACTION ── */}
        {authorization && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl space-y-4 mb-8"
          >
            <div className="rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-8 text-left relative overflow-hidden shadow-xl space-y-4 text-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-[10px] font-sans font-semibold text-neutral-500 uppercase tracking-widest block">
                  STEP 3 — AI AGENT PROPOSED ACTION
                </span>
                <span className="text-[10px] font-sans text-neutral-500 font-semibold">
                  AGENT ID: {authorization.agent_id}
                </span>
              </div>

              {/* Mutation Options for Testing Boundary Rules */}
              <div className="flex flex-wrap lg:flex-nowrap gap-2 justify-start items-center">
                <button
                  onClick={() => setMutation('normal')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'normal'
                      ? 'bg-neutral-900 text-white border-neutral-900 font-semibold shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>NORMAL ({currentCfg.formattedNormal})</span>
                </button>

                <button
                  onClick={() => setMutation('price_escalation')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'price_escalation'
                      ? 'bg-rose-950 text-rose-200 border-rose-900 font-semibold shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>PRICE ESCALATION ({currentCfg.formattedEscalated})</span>
                </button>

                <button
                  onClick={() => setMutation('product_mismatch')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'product_mismatch'
                      ? 'bg-rose-950 text-rose-200 border-rose-900 font-semibold shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  <Package className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>UNAPPROVED PRODUCT SKU</span>
                </button>

                <button
                  onClick={() => setMutation('unauthorized_merchant')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'unauthorized_merchant'
                      ? 'bg-rose-950 text-rose-200 border-rose-900 font-semibold shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  <Store className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>UNAUTHORIZED MERCHANT</span>
                </button>
              </div>

              {/* Action Details & Trigger Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-neutral-100">
                <div className="font-sans text-xs text-neutral-700">
                  <span className="text-neutral-500 uppercase text-[10px] block font-semibold">PROPOSED AGENT ACTION</span>
                  <span className="font-semibold text-sm text-neutral-900">
                    {mutation === 'product_mismatch'
                      ? 'Unapproved Product SKU'
                      : currentCfg.productName}{' '}
                    ·{' '}
                    <span className={mutation === 'price_escalation' ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {mutation === 'price_escalation' ? currentCfg.formattedEscalated : currentCfg.formattedNormal}
                    </span>{' '}
                    ·{' '}
                    <span className={mutation === 'unauthorized_merchant' ? 'text-rose-700 font-bold' : 'text-neutral-900 font-medium'}>
                      {mutation === 'unauthorized_merchant'
                        ? 'Unverified Marketplace Vendor'
                        : currentCfg.merchantName}
                    </span>
                  </span>
                </div>

                <button
                  onClick={handleExecuteAgentAction}
                  disabled={isVerifying}
                  className="px-6 py-3 rounded-full bg-neutral-900 text-white font-sans font-semibold text-xs sm:text-sm hover:bg-neutral-800 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 shadow-md"
                >
                  <Cpu className="h-4 w-4 stroke-[1.5]" />
                  <span>{isVerifying ? 'EVALUATING 21 CHECKS...' : 'SUBMIT AGENT ACTION'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Notification Banner */}
        {error && (
          <div className="w-full max-w-4xl mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-sans font-medium flex items-center gap-3 text-left">
            <XCircle className="h-5 w-5 stroke-[1.8] text-rose-600 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-rose-700 block uppercase tracking-wider text-[10px]">BACKEND PIPELINE FAILURE</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ── STEP 4: INTENTLOCK VERIFICATION RESULT ── */}
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl"
          >
            <div
              className={`rounded-2xl border p-6 sm:p-8 text-left relative overflow-hidden shadow-2xl space-y-6 bg-white ${
                verificationResult.decision === 'ALLOW'
                  ? 'border-emerald-300/80 shadow-emerald-900/5'
                  : 'border-rose-300/80 shadow-rose-900/5'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  {verificationResult.decision === 'ALLOW' ? (
                    <div className="h-10 w-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                      <ShieldCheck className="h-6 w-6 stroke-[1.8]" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
                      <ShieldAlert className="h-6 w-6 stroke-[1.8]" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-sans font-semibold text-neutral-500 uppercase tracking-widest block">
                      INTENTLOCK VERDICT
                    </span>
                    <h3
                      className={`text-xl sm:text-2xl font-sans font-bold tracking-tight ${
                        verificationResult.decision === 'ALLOW' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {verificationResult.decision === 'ALLOW'
                        ? 'AUTHORIZED — SETTLEMENT READY'
                        : 'BLOCKED — BOUNDARY ENFORCED'}
                    </h3>
                  </div>
                </div>

                <div className="text-right font-sans text-xs">
                  <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Checks Evaluated</span>
                  <span className="font-bold text-neutral-900 text-sm">
                    {verificationResult.checks_passed} / {verificationResult.checks_evaluated} Passed Engine
                  </span>
                </div>
              </div>

              {/* Explanation & Reason */}
              {(() => {
                let summary = verificationResult.reason || 'Authorization evaluation complete.';
                let rawJSON: string | undefined = undefined;

                if (summary.trim().startsWith('[') || summary.trim().startsWith('{')) {
                  rawJSON = summary;
                  try {
                    const parsed = JSON.parse(summary.trim());
                    if (Array.isArray(parsed)) {
                      const failedCheck = parsed.find(
                        (c: any) => c.status === 'FAIL' || c.passed === false
                      );
                      if (failedCheck) {
                        const ruleName = failedCheck.check || failedCheck.category || 'Boundary Check';
                        const detailMsg = failedCheck.reason || failedCheck.evidence || failedCheck.actual || 'Violation detected';
                        summary = `Rule Violation (${ruleName}): ${detailMsg}`;
                      } else {
                        summary = 'All 21 authorization checks passed cleanly on the live backend engine.';
                      }
                    }
                  } catch {
                    summary = 'Boundary evaluation complete.';
                  }
                }

                return (
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2 text-xs">
                    <span className="text-[10px] font-sans font-semibold text-neutral-500 uppercase tracking-wider block">
                      VERIFICATION ENGINE REASON
                    </span>
                    <p className="text-neutral-800 font-semibold leading-relaxed text-sm">
                      {summary}
                    </p>

                    {rawJSON && (
                      <details className="pt-2 border-t border-neutral-200/80 text-[10.5px]">
                        <summary className="cursor-pointer text-neutral-500 font-semibold hover:text-neutral-800 select-none">
                          View Raw Technical Audit Evidence Trace
                        </summary>
                        <pre className="mt-2 p-3 rounded-lg bg-neutral-900 text-neutral-200 font-mono text-[10px] overflow-x-auto max-h-48 whitespace-pre-wrap leading-tight">
                          {rawJSON}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })()}

              {/* Payment Order Action (If Authorized) or Replay Test Button (If Blocked) */}
              <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {verificationResult.decision === 'ALLOW' && paymentOrder ? (
                  <div className="flex items-center gap-3 text-xs font-sans text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl p-3 w-full">
                    <Zap className="h-5 w-5 stroke-[1.8] text-emerald-700" />
                    <span>
                      Razorpay Settlement Order Created: <strong className="font-bold text-emerald-950">{paymentOrder.razorpay_order_id || paymentOrder.id}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-sans text-neutral-500 font-medium">
                      Single-use authorization contract is now consumed/locked in SQLite database.
                    </span>

                    <button
                      onClick={handleReplayAttack}
                      disabled={isReplaying}
                      className="px-4 py-2 rounded-full bg-rose-950 text-rose-200 font-sans font-semibold text-xs hover:bg-rose-900 transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 border border-rose-800 shadow-sm"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 stroke-[1.8] ${isReplaying ? 'animate-spin' : ''}`} />
                      <span>{isReplaying ? 'TESTING REPLAY...' : 'TEST REPLAY ATTACK'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </section>
  );
}
