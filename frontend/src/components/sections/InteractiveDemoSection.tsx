import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Ticket,
  CreditCard,
  PenTool,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sliders,
  DollarSign,
  Package,
  Store,
  RefreshCw,
  Cpu,
} from 'lucide-react';

type IntentCategory = 'buy' | 'book' | 'pay' | 'custom';
type DemoStep = 'config' | 'evaluating' | 'result';
type AttackType = 'none' | 'price' | 'product' | 'merchant' | 'replay';

export function InteractiveDemoSection() {
  const [category, setCategory] = useState<IntentCategory>('buy');
  const [step, setStep] = useState<DemoStep>('config');
  const [activeAttack, setActiveAttack] = useState<AttackType>('none');

  // Form Fields State
  const [buyProduct, setBuyProduct] = useState('Wireless Mouse');
  const [buyBudget, setBuyBudget] = useState('₹1,500');
  const [buyMerchant, setBuyMerchant] = useState('Authorized merchants');

  const [bookItem, setBookItem] = useState('Flight Ticket (BLR -> DEL)');
  const [bookBudget, setBookBudget] = useState('₹15,000');
  const [bookClass, setBookClass] = useState('Economy Class');

  const [payPayee, setPayPayee] = useState('AWS Cloud Services');
  const [payBudget, setPayBudget] = useState('₹5,000');
  const [payFreq, setPayFreq] = useState('One-time authorization');

  const [customText, setCustomText] = useState(
    'Buy a wireless mouse under ₹1,500 from an authorized merchant.'
  );

  const handleCreateIntent = () => {
    setStep('evaluating');
    setActiveAttack('none');
    setTimeout(() => {
      setStep('result');
    }, 1100);
  };

  const handleReset = () => {
    setStep('config');
    setActiveAttack('none');
  };

  const triggerAttack = (attack: AttackType) => {
    setStep('evaluating');
    setTimeout(() => {
      setActiveAttack(attack);
      setStep('result');
    }, 600);
  };

  return (
    <section
      id="demo"
      className="relative w-full bg-[#000000] text-white font-sans antialiased px-4 sm:px-6 md:px-10 lg:px-14 py-20 sm:py-24 md:py-28 selection:bg-white/20 overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
        
        {/* ── SECTION HEADER ── */}
        <p className="text-xs sm:text-sm font-medium tracking-[0.22em] text-white/55 uppercase mb-3 font-mono">
          TRY INTENTLOCK
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] leading-[1.12] font-light tracking-tight text-white mb-4 max-w-3xl"
        >
          Define what your AI agent is allowed to do.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base sm:text-lg text-white/60 font-normal mb-8 sm:mb-10 max-w-xl"
        >
          What would you like your AI agent to do?
        </motion.p>

        {/* ── ELEGANT INTENT SELECTION PILLS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2.5 sm:gap-3.5 mb-10 w-full max-w-2xl"
        >
          <button
            onClick={() => {
              setCategory('buy');
              if (step !== 'config') handleReset();
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'buy'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4 stroke-[1.8]" />
            <span>Buy something</span>
          </button>

          <button
            onClick={() => {
              setCategory('book');
              if (step !== 'config') handleReset();
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'book'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <Ticket className="h-4 w-4 stroke-[1.8]" />
            <span>Book something</span>
          </button>

          <button
            onClick={() => {
              setCategory('pay');
              if (step !== 'config') handleReset();
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'pay'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4 stroke-[1.8]" />
            <span>Make a payment</span>
          </button>

          <button
            onClick={() => {
              setCategory('custom');
              if (step !== 'config') handleReset();
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'custom'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <PenTool className="h-4 w-4 stroke-[1.8]" />
            <span>Custom intent</span>
          </button>
        </motion.div>

        {/* ── MAIN INTERACTIVE CONTAINER ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-3xl rounded-3xl bg-[#0d0d0d] border border-white/10 noise-overlay p-6 sm:p-8 md:p-10 text-left relative overflow-hidden shadow-2xl"
        >
          <AnimatePresence mode="wait">
            
            {/* ── STATE 1: INTENT CONFIGURATION FORM ── */}
            {step === 'config' && (
              <motion.div
                key="config-state"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5 text-xs tracking-[0.2em] text-white/60 uppercase font-mono">
                    <Sliders className="h-3.5 w-3.5 text-white/70" />
                    <span>INTENT BOUNDARY CONFIGURATION</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/40">STEP 1 OF 2</span>
                </div>

                {/* Progressive Disclosure Fields based on Category */}
                {category === 'buy' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        What should it buy?
                      </label>
                      <input
                        type="text"
                        value={buyProduct}
                        onChange={(e) => setBuyProduct(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                        placeholder="e.g. Wireless Mouse"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Maximum budget?
                        </label>
                        <input
                          type="text"
                          value={buyBudget}
                          onChange={(e) => setBuyBudget(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                          placeholder="e.g. ₹1,500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Where can it buy?
                        </label>
                        <div className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 font-sans flex items-center justify-between">
                          <span>{buyMerchant}</span>
                          <CheckCircle2 className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === 'book' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        What should it book?
                      </label>
                      <input
                        type="text"
                        value={bookItem}
                        onChange={(e) => setBookItem(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Maximum budget?
                        </label>
                        <input
                          type="text"
                          value={bookBudget}
                          onChange={(e) => setBookBudget(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Airline Class
                        </label>
                        <div className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 font-sans flex items-center justify-between">
                          <span>{bookClass}</span>
                          <CheckCircle2 className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === 'pay' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        Payee Name
                      </label>
                      <input
                        type="text"
                        value={payPayee}
                        onChange={(e) => setPayPayee(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Maximum limit?
                        </label>
                        <input
                          type="text"
                          value={payBudget}
                          onChange={(e) => setPayBudget(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Authorization Frequency
                        </label>
                        <div className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 font-sans flex items-center justify-between">
                          <span>{payFreq}</span>
                          <CheckCircle2 className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === 'custom' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        Describe what your agent is allowed to do
                      </label>
                      <textarea
                        rows={3}
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans resize-none leading-relaxed"
                        placeholder="Enter natural language authorization intent..."
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCreateIntent}
                    className="liquid-glass rounded-full px-7 py-3 text-sm font-medium tracking-wide text-white bg-white/10 hover:bg-white/20 transition-all duration-300 flex items-center gap-2 cursor-pointer border border-white/20 shadow-lg"
                  >
                    <span>{category === 'custom' ? 'Continue' : 'Create Intent'}</span>
                    <ArrowRight className="h-4 w-4 stroke-[1.8]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STATE 2: EVALUATING ANIMATION ── */}
            {step === 'evaluating' && (
              <motion.div
                key="evaluating-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="py-12 flex flex-col items-center text-center space-y-4"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <Cpu className="h-5 w-5 text-white/80 absolute" />
                </div>
                <p className="text-sm font-mono tracking-wider text-white/70 uppercase">
                  INTENTLOCK ENFORCING BOUNDARIES...
                </p>
              </motion.div>
            )}

            {/* ── STATE 3: VERIFICATION SEQUENCE & SECURITY RESULTS ── */}
            {step === 'result' && (
              <motion.div
                key="result-state"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-white/60 uppercase font-mono">
                    <Sparkles className="h-3.5 w-3.5 text-white/70" />
                    <span>ENFORCEMENT AUDIT EVALUATION</span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>RESET</span>
                  </button>
                </div>

                {/* Compact Sequential Flow: USER INTENT -> AI AGENT -> PROPOSED ACTION -> INTENTLOCK */}
                <div className="space-y-3">
                  
                  {/* 1. USER INTENT */}
                  <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-white/45 mb-1 uppercase tracking-wider">
                      <span>1. USER AUTHORIZED INTENT</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-white/50" />
                    </div>
                    <div className="text-white/90 font-normal">
                      {category === 'buy' && `Purchase: ${buyProduct} | Max: ${buyBudget} | Target: ${buyMerchant}`}
                      {category === 'book' && `Book: ${bookItem} | Max: ${bookBudget} | Class: ${bookClass}`}
                      {category === 'pay' && `Payee: ${payPayee} | Max: ${payBudget} | Freq: ${payFreq}`}
                      {category === 'custom' && `Intent: ${customText}`}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-white/30 rotate-90" />
                  </div>

                  {/* 2. PROPOSED ACTION (Dynamic based on activeAttack) */}
                  <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-white/45 mb-1 uppercase tracking-wider">
                      <span>2. AI AGENT PROPOSED ACTION</span>
                      <Cpu className="h-3.5 w-3.5 text-white/50" />
                    </div>
                    <div className="text-white/90 font-normal flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {activeAttack === 'none' &&
                          (category === 'buy'
                            ? `${buyProduct} · ₹1,499 · Authorized Merchant`
                            : category === 'book'
                            ? `${bookItem} · ₹14,500 · Verified Booking`
                            : category === 'pay'
                            ? `${payPayee} · ₹4,900 · One-time Payment`
                            : `Wireless Mouse · ₹1,499 · Authorized Merchant`)}

                        {activeAttack === 'price' &&
                          `${buyProduct} · ₹1,850 · Authorized Merchant`}

                        {activeAttack === 'product' &&
                          `Mechanical Gaming Keyboard · ₹1,499 · Authorized Merchant`}

                        {activeAttack === 'merchant' &&
                          `${buyProduct} · ₹1,499 · Unverified Third-Party Marketplace`}

                        {activeAttack === 'replay' &&
                          `Duplicate Execution Attempt (Token: auth_token_982x)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-white/30 rotate-90" />
                  </div>

                  {/* 3. INTENTLOCK VERIFICATION & FINAL DECISION */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
                      activeAttack === 'none'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 font-mono text-xs tracking-wider uppercase text-white/70">
                        {activeAttack === 'none' ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-rose-400" />
                        )}
                        <span>INTENTLOCK EVALUATION RESULT</span>
                      </div>

                      {/* Status Badge */}
                      {activeAttack === 'none' ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>AUTHORIZED</span>
                        </div>
                      ) : (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>BLOCKED</span>
                        </div>
                      )}
                    </div>

                    {/* Checkmarks / Rejection Details */}
                    {activeAttack === 'none' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-emerald-300/90 pt-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>Intent matched</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>Limit verified</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>Target valid</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>Scope bound</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-mono text-xs text-rose-200/90 pt-1">
                        {activeAttack === 'price' && (
                          <p>
                            ✕ <span className="font-semibold">Spend Control Enforced:</span> Requested amount (₹1,850) exceeds authorized spending limit ({buyBudget}).
                          </p>
                        )}
                        {activeAttack === 'product' && (
                          <p>
                            ✕ <span className="font-semibold">Scope Control Enforced:</span> Proposed item 'Mechanical Gaming Keyboard' does not match authorized target intent ('{buyProduct}').
                          </p>
                        )}
                        {activeAttack === 'merchant' && (
                          <p>
                            ✕ <span className="font-semibold">Target Authorization Enforced:</span> Target merchant 'Unverified Third-Party Marketplace' is not an authorized vendor.
                          </p>
                        )}
                        {activeAttack === 'replay' && (
                          <p>
                            ✕ <span className="font-semibold">Replay Protection Enforced:</span> Authorization token 'auth_token_982x' has already been executed and cannot be reused.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* ── SECURITY HOOK / TEST AUTHORIZATION INTERACTION ── */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                      Test the Authorization Boundary:
                    </span>
                    {activeAttack !== 'none' && (
                      <button
                        onClick={() => triggerAttack('none')}
                        className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer text-left sm:text-right"
                      >
                        ← Return to Authorized State
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => triggerAttack('price')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                        activeAttack === 'price'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <DollarSign className="h-3 w-3" />
                      <span>Increase price (₹1,850)</span>
                    </button>

                    <button
                      onClick={() => triggerAttack('product')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                        activeAttack === 'product'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      <span>Change product</span>
                    </button>

                    <button
                      onClick={() => triggerAttack('merchant')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                        activeAttack === 'merchant'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Store className="h-3 w-3" />
                      <span>Change merchant</span>
                    </button>

                    <button
                      onClick={() => triggerAttack('replay')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                        activeAttack === 'replay'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Replay transaction</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
}
