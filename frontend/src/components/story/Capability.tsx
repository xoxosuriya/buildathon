import React from 'react';
import { motion } from 'framer-motion';

export const Capability: React.FC = () => {
  const pillars = [
    {
      num: "01",
      title: "SINGLE-USE LIFECYCLE",
      desc: "Each capability exists for exactly one execution. The moment the gateway captures the transaction, the token is atomically consumed and marked as USED."
    },
    {
      num: "02",
      title: "NON-DELEGABLE",
      desc: "The contract is cryptographically bound to the primary Agent ID. If it is passed down to a sub-agent, the verification engine instantly blocks execution."
    },
    {
      num: "03",
      title: "NON-SUBDIVIDABLE",
      desc: "A capability cannot be broken down into micro-transactions. An authorized amount of ₹1,200 is valid only for a single purchase of exactly ₹1,200."
    }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 flex flex-col items-center">
        
        {/* Title */}
        <div className="text-center max-w-2xl mb-16">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4 block">
            03 / CAPABILITY BOUNDARIES
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight">
            MATHEMATICALLY BOUNDED.<br />
            <span className="text-slate-500">EXPLICITLY RESTRICTED.</span>
          </h2>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {pillars.map((p, idx) => (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.15 }}
              className="text-left border-l border-white/10 pl-6 py-4 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-accent text-xs font-semibold block mb-4">
                  {p.num}
                </span>
                <h3 className="text-white text-base font-semibold tracking-wider uppercase mb-3">
                  {p.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};
