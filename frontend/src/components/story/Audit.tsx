import React from 'react';
import { motion } from 'framer-motion';

export const Audit: React.FC = () => {
  const auditLogs = [
    { event: "PROPOSAL_GENERATED", hash: "ca0987522c781631e847..." },
    { event: "AUTHORIZATION_CREATED", hash: "b44f45ad79d27d209182..." },
    { event: "TRANSACTION_VERIFIED", hash: "be7dec69c68914971298..." },
    { event: "PAYMENT_EXECUTED", hash: "8bdab680943c93691928..." }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left side text */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4">
            08 / IMMUTABLE AUDIT TRAIL
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight mb-8">
            CRYPTO EVIDENCE.<br />
            <span className="text-slate-500">TAMPERPROOF LOGS.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
            Every transaction event—from AI proposal generation to user authorization and payment gateway dispatch—is recorded in an append-only ledger. Each block cryptographically hashes the previous entry, establishing a chain of accountability.
          </p>
        </div>

        {/* Right side audit trail UI */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="liquid-glass rounded-2xl p-8 max-w-md w-full text-left"
          >
            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-6">
              SECURE AUDIT LEDGER CHAIN
            </div>

            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <div key={log.event} className="relative flex gap-4 pl-4 border-l border-white/10 pb-4 last:pb-0">
                  {/* Indicator Dot */}
                  <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
                  
                  <div className="font-mono text-xs">
                    <span className="text-white block font-medium uppercase tracking-wider">{log.event}</span>
                    <span className="text-slate-500 text-[10px] font-mono block mt-1">{log.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};
