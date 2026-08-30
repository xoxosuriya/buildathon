import React from 'react';
import { motion } from 'framer-motion';

export const Attacks: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 flex flex-col items-center">
        
        {/* Title */}
        <div className="text-center max-w-2xl mb-16">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4 block">
            05 / SECURITY BOUNDARIES
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight">
            BLOCKED BY DESIGN.<br />
            <span className="text-slate-500">ATTACK VECTOR DEFIANCE.</span>
          </h2>
        </div>

        {/* Attacks side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          
          {/* Price Inflation Attack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="border border-red-950/20 bg-red-950/[0.02] rounded-2xl p-8 text-left flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-red-400 font-mono tracking-widest uppercase">
                  [ VECTOR: PRICE INFLATION ]
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 border border-red-500/30 text-red-500 rounded bg-red-950/30">
                  BLOCKED
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved Max</span>
                  <span className="text-slate-300">₹1,200.00</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span className="text-slate-500">Requested</span>
                  <span>₹2,500.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trigger Rule</span>
                  <span className="text-slate-300">CHK-08 (Max Amount)</span>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs font-sans leading-relaxed border-t border-white/5 pt-4">
              The merchant attempted to inflate the price by ₹1,300 post-approval. The gateway intercepted and halted execution.
            </p>
          </motion.div>

          {/* Agent Delegation Attack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="border border-red-950/20 bg-red-950/[0.02] rounded-2xl p-8 text-left flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-red-400 font-mono tracking-widest uppercase">
                  [ VECTOR: DELEGATION LEAK ]
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 border border-red-500/30 text-red-500 rounded bg-red-950/30">
                  BLOCKED
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Authorized Agent</span>
                  <span className="text-slate-300">Agent-A</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span className="text-slate-500">Executing Agent</span>
                  <span>Agent-B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trigger Rule</span>
                  <span className="text-slate-300">CHK-05 (Delegation)</span>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs font-sans leading-relaxed border-t border-white/5 pt-4">
              Agent-A leaked or delegated the capability contract. Because authorization is bound strictly to Agent-A, Agent-B was blocked.
            </p>
          </motion.div>

        </div>

      </div>
    </div>
  );
};
