import React from 'react';
import { motion } from 'framer-motion';

export const ReplayDrift: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 flex flex-col items-center">
        
        {/* Title */}
        <div className="text-center max-w-2xl mb-16">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4 block">
            06 / TEMPORAL & VARIANCE CHECKS
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight">
            TEMPORAL CONTINUITY.<br />
            <span className="text-slate-500">STATE SYNCHRONICITY.</span>
          </h2>
        </div>

        {/* side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          
          {/* Replay Protection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="border border-white/5 bg-white/[0.01] rounded-2xl p-8 text-left flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-6 block">
                [ VECTOR: REPLAY ATTEMPT ]
              </span>
              <div className="space-y-4 font-mono text-xs mb-6">
                <div className="flex justify-between text-emerald-400">
                  <span>Execution 01</span>
                  <span>ALLOW (SUCCESS)</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Execution 02</span>
                  <span>BLOCKED (CHK-21 REPLAY)</span>
                </div>
                <div className="flex justify-between">
                  <span>Status on db</span>
                  <span className="text-red-400">ALREADY CONSUMED</span>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs font-sans leading-relaxed border-t border-white/5 pt-4">
              Single-use parameters are consumed atomically. Re-submitting the same signature results in a fail-closed block.
            </p>
          </motion.div>

          {/* Price Drift */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="border border-amber-950/20 bg-amber-950/[0.02] rounded-2xl p-8 text-left flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">
                  [ VECTOR: PRICE DRIFT ]
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 border border-amber-500/30 text-amber-500 rounded bg-amber-950/30">
                  REVIEW
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved Price</span>
                  <span className="text-slate-300">₹1,200.00</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span className="text-slate-500">Live Checkout</span>
                  <span>₹1,400.00</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span className="text-slate-500">User Resolution</span>
                  <span>ALLOW (RE-MINTED)</span>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs font-sans leading-relaxed border-t border-white/5 pt-4">
              Merchant updated pricing during checkout. The gateway halted execution for review. The user accepted and re-minted the capability contract.
            </p>
          </motion.div>

        </div>

      </div>
    </div>
  );
};
