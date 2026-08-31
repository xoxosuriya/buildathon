import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// ── Typewriter Hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let idx = 0;
    const delayId = setTimeout(() => {
      const intervalId = setInterval(() => {
        idx += 1;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) {
          clearInterval(intervalId);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(intervalId);
    }, startDelay);
    return () => clearTimeout(delayId);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// ── Container animation variants ────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

interface HeroProps {
  onLearnClick?: () => void;
}

export function HeroContent({ onLearnClick }: HeroProps) {
  const HEADLINE = 'AI should act\non your intent.\nNot beyond it.';
  const { displayed, done } = useTypewriter(HEADLINE, 36, 900);

  return (
    <div className="relative z-10 flex flex-col order-first lg:order-none w-full bg-white lg:bg-transparent pb-10 lg:pb-0 lg:min-h-screen">
      <main
        id="intentlock-hero"
        className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-12 sm:pt-16 lg:pt-0 flex-1 flex flex-col justify-center lg:min-h-screen"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl lg:max-w-2xl"
        >
          {/* Eyebrow */}
          <motion.p
            variants={itemVariants}
            className="text-[11px] sm:text-[12px] font-semibold tracking-[0.18em] text-neutral-400 uppercase mb-6 select-none font-sans"
          >
            INTENT-BOUND AUTHORIZATION
          </motion.p>

          {/* Headline with typewriter animation & restored deep blue color */}
          <motion.div variants={itemVariants}>
            <h1 className="text-[46px] sm:text-[58px] lg:text-[68px] xl:text-[76px] font-normal tracking-tight text-[#0A2540] leading-[1.06] mb-8 select-none whitespace-pre-wrap font-sans">
              {displayed}
              {!done && (
                <span className="inline-block w-[3px] h-[0.85em] bg-[#0A2540] align-middle ml-[3px] animate-blink" />
              )}
            </h1>
          </motion.div>

          {/* Supporting copy */}
          <motion.div variants={itemVariants}>
            <p className="text-[16px] sm:text-[18px] md:text-[19px] text-neutral-500 leading-relaxed font-normal mb-12 max-w-[480px] font-sans">
              IntentLock gives autonomous AI agents enforceable boundaries before they act, ensuring every transaction stays within what you actually authorized — and nothing more.
            </p>
          </motion.div>

          {/* Single Action CTA: SEE HOW IT WORKS */}
          <motion.div
            variants={itemVariants}
            className="flex items-center"
          >
            <button
              onClick={onLearnClick}
              className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-neutral-900 text-white text-[15px] font-sans font-medium transition-all duration-200 hover:bg-neutral-800 active:bg-black focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 cursor-pointer shadow-md"
            >
              <span>See How It Works</span>
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform duration-200"
              />
            </button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
