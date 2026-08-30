import React from 'react';
import { motion } from 'framer-motion';

export const Verification: React.FC = () => {
  const sampleChecks = [
    { code: "CHK-01", name: "Authorization Record Exists", ok: true },
    { code: "CHK-02", name: "Authorization Status Active", ok: true },
    { code: "CHK-05", name: "Agent Non-Delegation Match", ok: true },
    { code: "CHK-08", name: "Amount Within Bounded Limit", ok: true },
    { code: "CHK-19", name: "Live Price Drift Discrepancy", ok: true },
    { code: "CHK-21", name: "Replay Protection Lock", ok: true }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left side text */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4">
            04 / VERIFICATION GATEWAY
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight mb-8">
            THE 21-CHECK<br />
            <span className="text-slate-500">SECURITY SHIELD.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed mb-6">
            When the AI agent dispatches a transaction, IntentLock intercepts it. Our server-side engine evaluates 21 strict, deterministic parameters to verify that the request aligns perfectly with your approved intent.
          </p>
          <div className="flex gap-3">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase px-3 py-1 border border-white/10 rounded-full">
              Deterministic
            </span>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase px-3 py-1 border border-white/10 rounded-full">
              Zero-Trust
            </span>
          </div>
        </div>

        {/* Right side checkboard UI */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="liquid-glass rounded-2xl p-8 max-w-md w-full text-left"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                SECURITY COMPILATION
              </span>
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                ALLOW (21/21 OK)
              </span>
            </div>

            <div className="space-y-3 mb-6">
              {sampleChecks.map((chk) => (
                <div key={chk.code} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-accent text-[10px]">{chk.code}</span>
                    <span className="text-slate-300 font-mono">{chk.name}</span>
                  </div>
                  <span className="text-emerald-400 font-mono">PASS</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-600 font-mono text-center">
              + 15 additional checks verified successfully
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};
