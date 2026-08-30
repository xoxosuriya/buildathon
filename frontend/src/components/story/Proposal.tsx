import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

export const Proposal: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [hasEntered, setHasEntered] = useState<boolean>(false);

  // Trigger authorization activation 1s after entering viewport
  useEffect(() => {
    if (hasEntered) {
      const timer = setTimeout(() => {
        setIsAuthorized(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsAuthorized(false);
    }
  }, [hasEntered]);

  const tiltConfig = { damping: 25, stiffness: 220 };

  // AI Proposal Card Tilt
  const mouseX1 = useMotionValue(0);
  const mouseY1 = useMotionValue(0);
  const rotateX1 = useSpring(useTransform(mouseY1, [-0.5, 0.5], [4, -4]), tiltConfig);
  const rotateY1 = useSpring(useTransform(mouseX1, [-0.5, 0.5], [-4, 4]), tiltConfig);

  const handleMouseMove1 = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768 || shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xVal = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const yVal = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX1.set(xVal);
    mouseY1.set(yVal);
  };

  const handleMouseLeave1 = () => {
    mouseX1.set(0);
    mouseY1.set(0);
  };

  // User Authorization Card Tilt
  const mouseX2 = useMotionValue(0);
  const mouseY2 = useMotionValue(0);
  const rotateX2 = useSpring(useTransform(mouseY2, [-0.5, 0.5], [4, -4]), tiltConfig);
  const rotateY2 = useSpring(useTransform(mouseX2, [-0.5, 0.5], [-4, 4]), tiltConfig);

  const handleMouseMove2 = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768 || !isAuthorized || shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xVal = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const yVal = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX2.set(xVal);
    mouseY2.set(yVal);
  };

  const handleMouseLeave2 = () => {
    mouseX2.set(0);
    mouseY2.set(0);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      
      {/* Viewport detection to trigger sequence */}
      <motion.div 
        onViewportEnter={() => setHasEntered(true)}
        onViewportLeave={() => setHasEntered(false)}
        className="max-w-7xl mx-auto w-full px-8 flex flex-col items-center"
      >
        
        {/* Title */}
        <div className="text-center max-w-2xl mb-16 select-none">
          <span className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4 block">
            02 / PROPOSAL VS AUTHORITY
          </span>
          <h2 className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight">
            THE AI PROPOSES.<br />
            <span className="text-slate-500">THE USER AUTHORIZES.</span>
          </h2>
        </div>

        {/* Side-by-side Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          
          {/* AI Proposal Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onMouseMove={handleMouseMove1}
            onMouseLeave={handleMouseLeave1}
            style={{
              rotateX: shouldReduceMotion ? 0 : rotateX1,
              rotateY: shouldReduceMotion ? 0 : rotateY1,
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
            className="border border-white/5 bg-white/[0.01] rounded-2xl p-8 text-left flex flex-col justify-between cursor-default transition-all duration-300"
          >
            <div>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-6 block">
                [ PROPOSAL SNAPSHOT ]
              </span>
              <div className="space-y-4 font-sans">
                <div>
                  <label className="text-[10px] text-slate-600 uppercase tracking-wider block">Target SKU</label>
                  <span className="text-slate-300 font-mono text-sm">MOUSE-ERG-01</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 uppercase tracking-wider block">Merchant</label>
                  <span className="text-slate-300 font-mono text-sm">TechZone Peripherals</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 uppercase tracking-wider block">Proposed Price</label>
                  <span className="text-slate-300 font-mono text-lg font-semibold">₹1,200.00</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-600 uppercase">Status</span>
              <span className="text-[10px] text-amber-500 uppercase tracking-wider font-mono">Awaiting Consent</span>
            </div>
          </motion.div>

          {/* User Authorization Card (Locked ➔ Active Transition) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onMouseMove={handleMouseMove2}
            onMouseLeave={handleMouseLeave2}
            style={{
              rotateX: shouldReduceMotion ? 0 : rotateX2,
              rotateY: shouldReduceMotion ? 0 : rotateY2,
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
            className={`rounded-2xl p-8 text-left flex flex-col justify-between cursor-default transition-all duration-700 ${
              isAuthorized 
                ? 'liquid-glass opacity-100 border-emerald-500/20 shadow-lg shadow-emerald-950/10' 
                : 'border border-white/5 bg-white/[0.005] opacity-35 filter grayscale'
            }`}
          >
            <div>
              <span className={`text-[10px] font-mono tracking-widest uppercase mb-6 block transition-colors duration-500 ${
                isAuthorized ? 'text-accent' : 'text-slate-600'
              }`}>
                [ AUTHORIZATION CONTRACT ]
              </span>
              <div className="space-y-4 font-sans">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Authorized Target</label>
                  <span className={`font-mono text-sm transition-colors duration-500 ${isAuthorized ? 'text-white' : 'text-slate-400'}`}>
                    MOUSE-ERG-01
                  </span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Max Approved Value</label>
                  <span className={`font-mono text-lg font-semibold transition-colors duration-500 ${isAuthorized ? 'text-white' : 'text-slate-400'}`}>
                    ₹1,200.00
                  </span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Parameters</label>
                  <span className={`text-xs block font-mono transition-colors duration-500 ${isAuthorized ? 'text-emerald-400' : 'text-slate-600'}`}>
                    ✓ Non-Delegable
                  </span>
                  <span className={`text-xs block font-mono transition-colors duration-500 ${isAuthorized ? 'text-emerald-400' : 'text-slate-600'}`}>
                    ✓ Single Use Only
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase">State</span>
              <span className={`text-[10px] uppercase tracking-wider font-mono transition-colors duration-700 ${
                isAuthorized ? 'text-emerald-400' : 'text-slate-600'
              }`}>
                {isAuthorized ? 'MINTED / ACTIVE' : 'LOCKED / INACTIVE'}
              </span>
            </div>
          </motion.div>

        </div>

      </motion.div>
    </div>
  );
};
