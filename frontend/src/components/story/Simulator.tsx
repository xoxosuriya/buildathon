import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_VERIFICATION_RESULTS } from '../../data/mockData';

export const Simulator: React.FC = () => {
  const [running, setRunning] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<typeof MOCK_VERIFICATION_RESULTS['legitimate'] | null>(null);
  const [driftResolved, setDriftResolved] = useState<boolean>(false);

  const runScenario = (type: 'legitimate' | 'price_attack' | 'delegation_attack' | 'replay_attack' | 'price_drift') => {
    setRunning(true);
    setActiveScenario(type);
    setLogs([]);
    setResult(null);
    setDriftResolved(false);

    const steps = {
      legitimate: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Verifying Agent ShoppingBuddy credentials (CHK-05 passed)",
        "EVAL: Comparing requested amount (₹1,200.00) against limit (₹1,200.00) (CHK-08 passed)",
        "EVAL: Verifying live merchant catalog price match (CHK-19 passed)",
        "RESULT: All 21 security gate checks passed cleanly.",
        "GATEWAY: Initializing payment dispatch in Razorpay Test Mode...",
        "SUCCESS: Razorpay Order Created (order_test_rzp_9d0eed64). Contract marked as USED."
      ],
      price_attack: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Verifying Agent ShoppingBuddy credentials (CHK-05 passed)",
        "EVAL: Evaluating transaction request amount (₹2,500.00) against limit (₹1,200.00)",
        "FAIL: CHK-08 (Amount Within Bounded Limit) violation detected! Request exceeds limit by ₹1,300.00",
        "RESULT: Security boundary violation. Terminating pipeline execution.",
        "GATEWAY: Execution blocked. Contract state remains ACTIVE (unspent)."
      ],
      delegation_attack: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Evaluating executing agent: Agent-B",
        "FAIL: CHK-05 (Agent Non-Delegation Match) violation! Contract is bound to Agent-A and is non-delegable.",
        "RESULT: Security boundary violation. Terminating pipeline execution.",
        "GATEWAY: Execution blocked. Contract state remains ACTIVE (unspent)."
      ],
      replay_attack: [
        "PARSE: Request received to execute authorization AUTH-CONSUMED",
        "EVAL: Checking contract status...",
        "FAIL: CHK-02 (Authorization Status Active) and CHK-21 (Replay Protection Lock) failed.",
        "REJECT: Capability contract has already been spent. Double-spend attempt detected.",
        "RESULT: Security boundary violation. Terminating pipeline execution.",
        "GATEWAY: Execution blocked."
      ],
      price_drift: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Comparing signed proposal price (₹1,200.00) against live merchant checkout price (₹1,400.00)",
        "WARN: CHK-19 (Live Merchant Price Discrepancy) triggered. Live checkout price has shifted.",
        "RESULT: Operational variance detected. Halting for user review."
      ]
    };

    const runLogs = steps[type];
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < runLogs.length) {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${runLogs[currentIdx]}`]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setRunning(false);
        setResult(MOCK_VERIFICATION_RESULTS[type]);
      }
    }, 450);
  };

  const resolveDrift = () => {
    setRunning(true);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] USER RESOLVED: Accept price drift to ₹1,400.00`,
      `[${new Date().toLocaleTimeString()}] MINTING: Superseding AUTH-82F ➔ Minting new capability AUTH-83G`,
      `[${new Date().toLocaleTimeString()}] RE-EVAL: Evaluating AUTH-83G on 21-check gateway...`,
      `[${new Date().toLocaleTimeString()}] SUCCESS: Re-verification ALLOW. Creating Razorpay order...`
    ]);

    setTimeout(() => {
      setRunning(false);
      setDriftResolved(true);
      setResult({
        id: "vr_drift_resolved",
        transaction_id: "txn_drift_resolved",
        authorization_id: "auth_legit_83g",
        decision: "ALLOW",
        reason: "User accepted price increase to ₹1,400.00. Newly minted capability verified successfully.",
        checks_evaluated: 21,
        checks_passed: 21,
        created_at: new Date().toISOString()
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-5 text-left flex flex-col justify-center gap-6">
          <div>
            <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4 block">
              09 / SIMULATOR RUNS
            </span>
            <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight mb-4">
              GATEWAY SIMULATOR.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Initiate any execution scenario to trace the security evaluation log and inspect decision outcomes.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: 'legitimate', label: 'Legitimate Purchase', badge: 'ALLOW', colorClass: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10' },
              { id: 'price_attack', label: 'Price Inflation Attack', badge: 'BLOCK', colorClass: 'border-red-500/20 text-red-400 bg-red-950/10' },
              { id: 'delegation_attack', label: 'Agent Delegation Attack', badge: 'BLOCK', colorClass: 'border-red-500/20 text-red-400 bg-red-950/10' },
              { id: 'replay_attack', label: 'Replay Protection Lock', badge: 'BLOCK', colorClass: 'border-red-500/20 text-red-400 bg-red-950/10' },
              { id: 'price_drift', label: 'Live Price Drift', badge: 'REVIEW', colorClass: 'border-amber-500/20 text-amber-400 bg-amber-950/10' }
            ].map((scen) => (
              <button
                key={scen.id}
                onClick={() => runScenario(scen.id as any)}
                disabled={running}
                className={`flex justify-between items-center px-6 py-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left font-sans text-sm font-medium tracking-wide uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                  activeScenario === scen.id ? 'border-accent bg-white/[0.04]' : ''
                }`}
              >
                <span className="text-white">{scen.label}</span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 border rounded ${scen.colorClass}`}>
                  {scen.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Console Log Trace */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="liquid-glass rounded-2xl p-0 w-full overflow-hidden text-left flex flex-col h-[280px]">
            <div className="bg-white/[0.03] px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                GATEWAY PROCESSOR TRACE
              </span>
              {running && (
                <span className="text-[10px] text-accent font-mono animate-pulse uppercase">
                  PROCESSING...
                </span>
              )}
            </div>
            
            <div className="p-6 font-mono text-[11px] leading-relaxed bg-[#05070c] flex-1 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <span className="text-slate-600 italic block">
                  &gt; Select an execution scenario on the left to initialize the verification trace.
                </span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-accent">&gt;</span>
                    <span className={
                      log.includes('FAIL') || log.includes('blocked') ? 'text-red-400' :
                      log.includes('SUCCESS') || log.includes('passed') ? 'text-emerald-400' :
                      log.includes('WARN') ? 'text-amber-400' : 'text-slate-300'
                    }>
                      {log}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decision Results Panel */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className={`liquid-glass rounded-xl p-6 text-left border-l-4 ${
                  result.decision === 'ALLOW' ? 'border-l-emerald-500' :
                  result.decision === 'BLOCK' ? 'border-l-red-500' : 'border-l-amber-500'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                    EVALUATION RESULT
                  </span>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 border rounded uppercase ${
                    result.decision === 'ALLOW' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10' :
                    result.decision === 'BLOCK' ? 'border-red-500/20 text-red-400 bg-red-950/10' :
                    'border-amber-500/20 text-amber-400 bg-amber-950/10'
                  }`}>
                    {result.decision}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {result.reason}
                </p>

                {/* Price Drift Interactive Resolver */}
                {result.decision === 'REVIEW' && !driftResolved && (
                  <div className="mt-4 flex justify-start">
                    <button
                      onClick={resolveDrift}
                      className="liquid-glass rounded-full px-6 py-2.5 text-xs font-medium text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      Accept drift to ₹1,400.00 &amp; Resolve
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
