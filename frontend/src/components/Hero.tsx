import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { AnimatedText } from './AnimatedText';

interface HeroProps {
  onExplore: () => void;
  onLaunchDemo: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onLaunchDemo }) => {
  const shouldReduceMotion = useReducedMotion();

  // Mouse Parallax values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 45, stiffness: 280, mass: 1.2 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Parallax multipliers (extremely subtle depth)
  const headlineX = useTransform(springX, [-1, 1], shouldReduceMotion ? [0, 0] : [-12, 12]);
  const headlineY = useTransform(springY, [-1, 1], shouldReduceMotion ? [0, 0] : [-12, 12]);

  const descX = useTransform(springX, [-1, 1], shouldReduceMotion ? [0, 0] : [-8, 8]);
  const descY = useTransform(springY, [-1, 1], shouldReduceMotion ? [0, 0] : [-8, 8]);

  const ctaX = useTransform(springX, [-1, 1], shouldReduceMotion ? [0, 0] : [-4, 4]);
  const ctaY = useTransform(springY, [-1, 1], shouldReduceMotion ? [0, 0] : [-4, 4]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (window.innerWidth < 768 || shouldReduceMotion) return;
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const y = (clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Entrance motion variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.18,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number], // Premium easing
      }
    }
  };


  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden select-none"
    >
      
      {/* Fullscreen Video Background */}
      <div className="absolute inset-0 w-full h-full z-0 bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-60 mix-blend-screen"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-[#07090e]/60 z-10 pointer-events-none" />
      </div>

      {/* Hero Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto flex flex-col items-center"
      >
        
        {/* Micro Statement */}
        <motion.span 
          variants={itemVariants}
          className="text-accent font-semibold tracking-[0.2em] text-[10px] sm:text-xs uppercase mb-6"
        >
          CAPABILITY-BASED TRANSACTION SECURITY
        </motion.span>

        {/* Large Cinematic Headline */}
        <motion.h1 
          variants={itemVariants}
          style={{ x: headlineX, y: headlineY }}
          className="font-serif-display text-5xl sm:text-7xl md:text-[88px] leading-[0.95] tracking-[-2.46px] font-normal max-w-5xl mb-8"
        >
          <span className="text-white block">AI CAN BUY.</span>
          <span className="text-slate-500 block mt-1">IT CANNOT OVERRIDE YOU.</span>
        </motion.h1>

        {/* Supporting Copy */}
        <motion.p 
          variants={itemVariants}
          style={{ x: descX, y: descY }}
          className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mt-4 leading-relaxed"
        >
          IntentLock lets AI agents propose and execute transactions without giving them the authority to redefine what the user intended.
        </motion.p>

        {/* Primary CTA */}
        <motion.div 
          variants={itemVariants}
          style={{ x: ctaX, y: ctaY }}
          className="mt-12"
        >
          <button
            onClick={onExplore}
            className="liquid-glass rounded-full px-14 py-5 text-sm sm:text-base font-medium text-white transition-all duration-300 ease-out hover:scale-105 active:scale-95 flex items-center gap-2 group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <AnimatedText text="Explore IntentLock" />
            <ArrowRight size={16} className="text-accent group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </motion.div>
      </motion.div>

      {/* Subtle Scroll Indicator */}
      <div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce flex flex-col items-center gap-2 cursor-pointer" 
        onClick={onExplore}
      >
        <span className="text-[10px] text-slate-500 tracking-widest uppercase">Scroll to trace</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-accent to-transparent" />
      </div>

    </div>
  );
};
