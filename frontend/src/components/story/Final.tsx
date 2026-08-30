import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedText } from '../AnimatedText';

interface FinalProps {
  onRestart: () => void;
}

export const Final: React.FC<FinalProps> = ({ onRestart }) => {
  const shouldReduceMotion = useReducedMotion();

  const textVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (customDelay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: shouldReduceMotion ? 0 : customDelay,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
      }
    })
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center py-20 relative overflow-hidden">
      
      {/* Background Graphic elements */}
      <div className="absolute inset-0 bg-[#07090e] z-0 opacity-80" />
      <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(220, 80, 0, 0.03) 0%, transparent 80%) z-10 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-8 text-center flex flex-col items-center gap-12">
        
        {/* Cinematic Closing Stack */}
        <h2 className="font-serif-display text-4xl sm:text-6xl md:text-7xl font-normal leading-[1.05] tracking-tight uppercase select-none">
          <motion.span
            custom={0}
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="block text-slate-500"
          >
            THE AI PROPOSES.
          </motion.span>
          <motion.span
            custom={0.2}
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="block text-slate-400 mt-2"
          >
            THE USER AUTHORIZES.
          </motion.span>
          <motion.span
            custom={0.4}
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="block text-slate-300 mt-2"
          >
            INTENTLOCK ENFORCES.
          </motion.span>
          <motion.span
            custom={0.6}
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="block text-white mt-2"
          >
            PAYMENT EXECUTES.
          </motion.span>
        </h2>

        {/* CTA to scroll back to hero */}
        <motion.div
          custom={0.8}
          variants={textVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-8"
        >
          <button
            onClick={onRestart}
            className="liquid-glass rounded-full px-10 py-4 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <AnimatedText text="Return to Beginning" />
          </button>
        </motion.div>

      </div>
    </div>
  );
};
