import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  DollarSign,
  Package,
  Store,
  RefreshCw,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';
import { AuthorizationContract, VerificationResult, PaymentOrder } from '../types/api';

type MutationType = 'normal' | 'price_escalation' | 'product_mismatch' | 'unauthorized_merchant';

interface LiveDemoPageProps {
  onBack: () => void;
}

export function LiveDemoPage({ onBack }: LiveDemoPageProps) {
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
      productName: 'Deluxe Hotel Suite (1 Night)',
      productId: 'PROD-HOTEL-01',
      merchantName: 'Grand Plaza Hotel',
      merchantId: 'MERCH-HOTEL-01',
      normalAmount: '4800.00',
      formattedNormal: '₹4,800.00',
      escalatedAmount: '6500.00',
      formattedEscalated: '₹6,500.00',
    },
    payment: {
      action: 'PAYMENT',
      prompt: 'Pay software subscription invoice under ₹10,000.',
      maxAmount: '10000.00',
      formattedMax: '₹10,000.00',
      productName: 'SaaS Enterprise Subscription',
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

  const handleReset = () => {
    setActiveIntentId(null);
    setAuthorization(null);
    setTransactionId(null);
    setVerificationResult(null);
    setPaymentOrder(null);
    setError(null);
    setMutation('normal');
  };

  const parseError = (err: any): string => {
    if (!err) return 'Unknown error occurred.';
    const raw = typeof err === 'string' ? err : err.message || String(err);
    try {
      const parsed = JSON.parse(raw);
      if (parsed.detail) return String(parsed.detail);
    } catch {}
    return raw;
  };

  // STEP 1 & 2: User Defines Intent & Mints Authorization via Real FastAPI Backend
  const handleMintAuthorization = async () => {
    setIsMinting(true);
    setError(null);
    setAuthorization(null);
    setTransactionId(null);
    setVerificationResult(null);
    setPaymentOrder(null);

    try {
      const intentRes = await apiService.createIntent({
        raw_prompt: currentCfg.prompt,
        action: currentCfg.action,
        max_amount: currentCfg.maxAmount,
        quantity: 1,
        category: 'ELECTRONICS',
      });
      setActiveIntentId(intentRes.id);

      const proposalRes = await apiService.createProposal(intentRes.id, currentCfg.productId, 1);
      const authRes = await apiService.approveProposal(proposalRes.proposal_id, intentRes.id);
      setAuthorization(authRes);
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsMinting(false);
    }
  };

  // STEP 3 & 4 & 5: Submit Agent Action & Run 21-Check Verification Engine on Backend
  const handleExecuteVerification = async () => {
    if (!authorization) return;
    setIsVerifying(true);
    setError(null);
    setTransactionId(null);
    setVerificationResult(null);
    setPaymentOrder(null);

    try {
      let reqAmount = currentCfg.normalAmount;
      let targetProduct = authorization.product_id || currentCfg.productId;
      let targetMerchant = authorization.merchant_id || currentCfg.merchantId;
      let executingAgent = authorization.agent_id || 'AGENT-DEFAULT';

      if (mutation === 'price_escalation') {
        reqAmount = currentCfg.escalatedAmount;
      } else if (mutation === 'product_mismatch') {
        targetProduct = 'PROD-UNAPPROVED-SUB';
      } else if (mutation === 'unauthorized_merchant') {
        targetMerchant = 'MERCH-UNVERIFIED-MARKETPLACE';
      }

      const txRes = await apiService.createTransaction({
        authorization_id: authorization.id,
        agent_id: executingAgent,
        merchant_id: targetMerchant,
        product_id: targetProduct,
        requested_amount: reqAmount,
        quantity: 1,
        currency: 'INR',
      });
      setTransactionId(txRes.id);

      const verifRes = await apiService.verifyTransaction(txRes.id);
      setVerificationResult(verifRes);

      if (verifRes.decision === 'ALLOW') {
        try {
          const payRes = await apiService.executePayment(txRes.id, verifRes.id);
          setPaymentOrder(payRes);
        } catch {
          // Payment order status handled cleanly
        }
      }
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // REPLAY ATTACK TEST
  const handleTestReplayAttack = async () => {
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
    <div className="min-h-screen w-full bg-[#000000] text-[#F2F2F0] font-sans antialiased selection:bg-white/20">
      
      {/* ── LIVE DEMO HEADER NAV ── */}
      <header className="w-full border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-sans font-medium text-[#F2F2F0]/70 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          <span>Back to IntentLock Overview</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-sans font-semibold tracking-wider text-white uppercase">
            INTENTLOCK LIVE INTERACTIVE SANDBOX
          </span>
        </div>
      </header>

      {/* ── SANDBOX CONTENT ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 flex flex-col items-center text-center">
        
        <p className="text-xs sm:text-sm font-medium tracking-[0.22em] text-[#F2F2F0]/55 uppercase mb-3 font-sans">
          INTERACTIVE SECURITY TESTING
        </p>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#F2F2F0] mb-4 font-sans max-w-4xl">
          Test IntentLock yourself in real time.
        </h1>

        <p className="text-base sm:text-lg text-[#F2F2F0]/60 font-normal mb-10 max-w-2xl font-sans">
          Select an intent, mint an enforceable authorization on the live FastAPI backend, submit autonomous agent transactions, and test boundary enforcement against our 21-check engine.
        </p>

        {/* ── STEP 1: DEFINE INTENT ── */}
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
                    ? 'bg-white text-black border-white shadow-lg font-semibold'
                    : 'liquid-glass text-[#F2F2F0]/70 border-white/12 hover:border-white/25 hover:text-[#F2F2F0]'
                }`}
              >
                {tab === 'buy' && <Package className="h-4 w-4 stroke-[1.5] text-current" />}
                {tab === 'book' && <Store className="h-4 w-4 stroke-[1.5] text-current" />}
                {tab === 'payment' && <CreditCard className="h-4 w-4 stroke-[1.5] text-current" />}
                <span className="uppercase">{tab === 'buy' ? 'BUY SOMETHING' : tab === 'book' ? 'BOOK SOMETHING' : 'MAKE A PAYMENT'}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-[#0d0d0d] border border-white/12 noise-overlay p-6 text-left relative overflow-hidden shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-sans font-medium text-[#F2F2F0]/40 uppercase tracking-widest block">
                  STEP 1 — DEFINE USER INTENT
                </span>
                <h3 className="text-base sm:text-lg font-sans font-medium text-[#F2F2F0] mt-0.5">
                  "{currentCfg.prompt}"
                </h3>
              </div>

              <button
                onClick={handleMintAuthorization}
                disabled={isMinting}
                className="px-5 py-2.5 rounded-full bg-white text-black font-sans font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Lock className="h-4 w-4 stroke-[1.5]" />
                <span>{isMinting ? 'MINTING AUTHORIZATION...' : 'MINT AUTHORIZATION CONTRACT'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#F2F2F0]/80">
              <div>
                <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Action</span>
                <span className="font-sans font-medium">{currentCfg.action}</span>
              </div>
              <div>
                <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Maximum Amount</span>
                <span className="font-sans font-medium text-emerald-300">{currentCfg.formattedMax}</span>
              </div>
              <div>
                <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Target Merchant</span>
                <span className="font-sans font-medium">{currentCfg.merchantName}</span>
              </div>
              <div>
                <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Contract Scope</span>
                <span className="font-sans font-medium text-emerald-300">Single-use · Non-Delegable</span>
              </div>
            </div>

            {/* STEP 2: AUTHORIZATION ACTIVE */}
            {authorization && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/70 border border-emerald-500/30 rounded-xl p-4 font-sans text-xs space-y-2 mt-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wide">
                    <CheckCircle2 className="h-4 w-4 stroke-[1.5]" />
                    <span>STEP 2 — AUTHORIZATION ACTIVE (MINTED IN SQLITE DB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      State: {authorization.status}
                    </span>
                    <span className="text-[10px] font-mono text-[#F2F2F0]/40">
                      ID: {authorization.id}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[#F2F2F0]/90">
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Authorization ID</span>
                    <span className="font-mono text-[11px] text-white">{authorization.id}</span>
                  </div>
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Intent ID</span>
                    <span className="font-mono text-[11px] text-white">{activeIntentId || authorization.intent_id}</span>
                  </div>
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Max Bounded Limit</span>
                    <span className="font-sans font-medium text-emerald-300">{currentCfg.formattedMax}</span>
                  </div>
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-sans">Backend Provenance</span>
                    <span className="font-sans text-[11px] text-[#F2F2F0]/70">FastAPI · SQLite DB</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── STEP 3: AGENT PROPOSED ACTION ── */}
        {authorization && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl space-y-4 mb-8"
          >
            <div className="rounded-2xl bg-[#0d0d0d] border border-white/12 noise-overlay p-6 text-left relative overflow-hidden shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-sans font-medium text-[#F2F2F0]/40 uppercase tracking-widest block">
                  STEP 3 — AI AGENT PROPOSED ACTION
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80">
                  AGENT ID: {authorization.agent_id}
                </span>
              </div>

              {/* Mutation Options for Testing */}
              <div className="flex flex-wrap lg:flex-nowrap gap-2 justify-start items-center">
                <button
                  onClick={() => setMutation('normal')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'normal'
                      ? 'bg-white/15 text-white border-white/40 font-semibold'
                      : 'liquid-glass text-[#F2F2F0]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>NORMAL ({currentCfg.formattedNormal})</span>
                </button>

                <button
                  onClick={() => setMutation('price_escalation')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'price_escalation'
                      ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 font-semibold'
                      : 'liquid-glass text-[#F2F2F0]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>PRICE ESCALATION ({currentCfg.formattedEscalated})</span>
                </button>

                <button
                  onClick={() => setMutation('product_mismatch')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'product_mismatch'
                      ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 font-semibold'
                      : 'liquid-glass text-[#F2F2F0]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Package className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>UNAPPROVED PRODUCT SKU</span>
                </button>

                <button
                  onClick={() => setMutation('unauthorized_merchant')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium flex items-center gap-2 cursor-pointer border ${
                    mutation === 'unauthorized_merchant'
                      ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 font-semibold'
                      : 'liquid-glass text-[#F2F2F0]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Store className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>UNAUTHORIZED MERCHANT</span>
                </button>
              </div>

              {/* Action Details & Trigger */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
                <div className="font-sans text-xs text-[#F2F2F0]/80">
                  <span className="text-[#F2F2F0]/40 uppercase text-[10px] block">PROPOSED AGENT ACTION</span>
                  <span className="font-medium text-sm">
                    {mutation === 'product_mismatch'
                      ? 'Unapproved Product SKU'
                      : currentCfg.productName}{' '}
                    ·{' '}
                    <span className={mutation === 'price_escalation' ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-medium'}>
                      {mutation === 'price_escalation' ? currentCfg.formattedEscalated : currentCfg.formattedNormal}
                    </span>{' '}
                    ·{' '}
                    <span className={mutation === 'unauthorized_merchant' ? 'text-rose-300 font-semibold' : ''}>
                      {mutation === 'unauthorized_merchant' ? 'Unverified Marketplace' : currentCfg.merchantName}
                    </span>
                  </span>
                </div>

                <button
                  onClick={handleExecuteVerification}
                  disabled={isVerifying}
                  className="px-6 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-sans font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 shadow-lg"
                >
                  <Cpu className="h-4 w-4 stroke-[1.5] text-black" />
                  <span>{isVerifying ? 'INTENTLOCK VERIFYING (21 CHECKS)...' : 'SUBMIT AGENT ACTION TO BACKEND'}</span>
                  <ArrowRight className="h-4 w-4 stroke-[1.5]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4 & 5: VERDICT ── */}
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-4xl p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 font-sans text-xs text-left space-y-2 shadow-xl"
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldAlert className="h-5 w-5 stroke-[1.5] text-rose-400 shrink-0" />
                <span>BACKEND UNAVAILABLE</span>
              </div>
              <p className="text-[#F2F2F0]/70 font-sans text-xs">
                Unable to reach the IntentLock verification backend. Ensure FastAPI server is running on port 8000.
              </p>
              <div className="pt-2 text-[10px] font-mono text-rose-300/60 uppercase">
                ERROR: {error}
              </div>
            </motion.div>
          ) : isVerifying ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-4xl p-8 rounded-2xl bg-[#0d0d0d] border border-white/12 text-center font-sans text-xs text-[#F2F2F0]/60 animate-pulse flex flex-col items-center justify-center gap-3 shadow-2xl"
            >
              <Cpu className="h-6 w-6 stroke-[1.5] animate-spin text-emerald-400" />
              <span className="font-medium tracking-wide text-sm text-[#F2F2F0]">
                INTENTLOCK VERIFYING · 21 SECURITY CHECKS EVALUATING ON BACKEND...
              </span>
              <span className="text-[10px] font-mono text-[#F2F2F0]/40">
                Executing verification_engine.verify_transaction_by_id() against SQLite database
              </span>
            </motion.div>
          ) : verificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-4xl rounded-2xl bg-[#0d0d0d] border border-white/12 noise-overlay p-6 sm:p-8 text-left shadow-2xl space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-sans font-medium text-[#F2F2F0]/40 uppercase tracking-widest block">
                    STEP 5 — INTENTLOCK BACKEND VERDICT
                  </span>
                  <div className="flex items-center gap-2 font-sans text-xs tracking-wider uppercase text-[#F2F2F0]/60 font-medium mt-1">
                    {verificationResult.decision === 'ALLOW' ? (
                      <ShieldCheck className="h-5 w-5 stroke-[1.5] text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 stroke-[1.5] text-rose-400" />
                    )}
                    <span>FASTAPI VERIFICATION ENGINE EVALUATION COMPLETE</span>
                  </div>
                </div>

                {verificationResult.decision === 'ALLOW' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-sans font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
                    <CheckCircle2 className="h-4 w-4 stroke-[1.5]" />
                    <span>AUTHORIZED</span>
                  </div>
                ) : (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-1.5 rounded-full text-xs font-sans font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.2)] shrink-0">
                    <XCircle className="h-4 w-4 stroke-[1.5]" />
                    <span>BLOCKED</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 font-sans">
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#F2F2F0]/40 uppercase tracking-widest">
                    <span>BACKEND REASON & EVIDENCE</span>
                    <span>21 CHECKS EVALUATED</span>
                  </div>

                  <p className={`text-xs sm:text-sm font-medium ${verificationResult.decision === 'ALLOW' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {verificationResult.reason}
                  </p>

                  {paymentOrder && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <CheckCircle2 className="h-4 w-4 stroke-[1.5]" />
                        <span>RAZORPAY TEST PAYMENT DISPATCHED</span>
                      </div>
                      <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                        Razorpay Order ID: {paymentOrder.razorpay_order_id}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-sans">
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-mono">BACKEND</span>
                    <span className="font-mono text-white text-[11px]">FastAPI Framework</span>
                  </div>
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-mono">VERIFICATION</span>
                    <span className="font-mono text-white text-[11px]">21-Check Engine</span>
                  </div>
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-mono">TRANSACTION ID</span>
                    <span className="font-mono text-white text-[11px] truncate block">{transactionId || verificationResult.transaction_id}</span>
                  </div>
                  <div>
                    <span className="text-[#F2F2F0]/40 block text-[10px] uppercase font-mono">AUTHORIZATION ID</span>
                    <span className="font-mono text-white text-[11px] truncate block">{authorization?.id}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                  <div className="text-[11px] text-[#F2F2F0]/50 font-sans">
                    <span>Test single-use contract protection by re-submitting this transaction.</span>
                  </div>

                  <button
                    onClick={handleTestReplayAttack}
                    disabled={isReplaying}
                    className="px-4 py-2 rounded-full bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 font-sans font-medium text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5 stroke-[1.5]" />
                    <span>{isReplaying ? 'TESTING REPLAY...' : 'TEST REPLAY ATTACK (SUBMIT AGAIN)'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
