import React from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

export const UserIntent: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // 3D Card Tilt state
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const tiltConfig = { damping: 25, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), tiltConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), tiltConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768 || shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xVal = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const yVal = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX.set(xVal);
    mouseY.set(yVal);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Section reveals
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      }
    }
  };

  // Log lines staggered entrance variants
  const logContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.35,
        delayChildren: 0.4
      }
    }
  };

  const logItem = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left side text reveals sequentially */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          variants={{
            visible: {
              transition: { staggerChildren: 0.15 }
            }
          }}
          className="lg:col-span-7 text-left flex flex-col justify-center"
        >
          <motion.span 
            variants={sectionVariants}
            className="text-accent font-semibold tracking-wider text-[10px] sm:text-xs uppercase mb-4"
          >
            01 / USER INTENT
          </motion.span>
          <motion.h2 
            variants={sectionVariants}
            className="font-serif-display text-4xl sm:text-5xl md:text-6xl text-white font-normal leading-[1.05] tracking-tight mb-8"
          >
            "BUY ONE WIRELESS MOUSE<br />
            <span className="text-slate-500">UNDER ₹1,500."</span>
          </motion.h2>
          <motion.p 
            variants={sectionVariants}
            className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed"
          >
            The AI agent acts as a researcher. It discovers products, evaluates merchants, and compares specifications—but it does not hold the keys to execution.
          </motion.p>
        </motion.div>

        {/* Right side visual log card with 3D Tilt */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX: shouldReduceMotion ? 0 : rotateX,
              rotateY: shouldReduceMotion ? 0 : rotateY,
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
            className="liquid-glass rounded-2xl p-8 max-w-sm w-full text-left cursor-default shadow-2xl transition-shadow duration-300 hover:shadow-black/40"
          >
            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-6 select-none">
              AGENT PROCESSOR LOG
            </div>
            
            {/* Terminal log lines typing sequentially */}
            <motion.div 
              variants={logContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-4 font-mono text-xs text-slate-400"
            >
              <motion.div variants={logItem} className="flex gap-2">
                <span className="text-accent">&gt;</span>
                <span>Context initialized for task: Purchase Mouse</span>
              </motion.div>
              <motion.div variants={logItem} className="flex gap-2 text-emerald-400">
                <span className="text-accent">&gt;</span>
                <span>Product SKU discovered: MOUSE-ERG-01</span>
              </motion.div>
              <motion.div variants={logItem} className="flex gap-2 text-slate-500">
                <span className="text-accent">&gt;</span>
                <span>Base price: ₹1,200.00 | Authority: NONE</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};
