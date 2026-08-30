import React from 'react';
import { motion } from 'framer-motion';

export const Payment: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left side text */}
        <div className="lg:col-span-7 text-left flex flex-col justify-center">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4">
            07 / SETTLEMENT & CLEARING
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight mb-8">
            RAZORPAY EXECUTES.<br />
            <span className="text-slate-500">SECURE DISPATCH.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
            Only when the transaction passes all 21 checks does the gateway initialize execution. IntentLock securely communicates with the Razorpay Test Mode endpoint, creating a valid, isolated checkout order.
          </p>
        </div>

        {/* Right side checkout visual */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="liquid-glass rounded-2xl p-8 max-w-sm w-full text-left"
          >
            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-6">
              RAZORPAY ORDER DETAILS
            </div>
            
            <div className="space-y-4 font-mono text-xs text-slate-300">
              <div>
                <span className="text-slate-500 uppercase block">Order ID</span>
                <span className="text-white font-semibold">order_test_rzp_9d0eed64</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 uppercase block">Amount</span>
                  <span className="text-white">₹1,200.00</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block">Currency</span>
                  <span className="text-white">INR</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 uppercase block">Status</span>
                <span className="text-emerald-400 font-semibold uppercase tracking-wider">SUCCESS / CREATED</span>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};
