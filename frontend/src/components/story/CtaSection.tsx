import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { FadeUp } from './FadeUp';
import { PrimaryButton } from './PrimaryButton';
import { CtaDashboardMock } from './CtaDashboardMock';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind md/sm breakpoint
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

export const CtaSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  
  const { scrollYProgress } = useScroll({ 
    target: sectionRef, 
    offset: ["start end", "end start"] 
  });

  const smoothProgress = useSpring(scrollYProgress, {
    damping: 45,
    stiffness: 280,
    mass: 1.2
  });

  const dashboardY = useTransform(smoothProgress, [0, 1], ["120px", "-120px"]);
  const grassY = useTransform(smoothProgress, [0, 1], isMobile ? ["80px", "-40px"] : ["200px", "-200px"]);


  return (
    <section
      ref={sectionRef}
      id="cta"
      className="relative w-full overflow-x-hidden"
      style={{ background: "linear-gradient(to bottom, transparent 0%, #14191E 100%)" }}
    >
      <div className="relative mx-auto max-w-[1080px] px-4 sm:px-6 pt-24 sm:pt-32 md:pt-40 pb-[540px] sm:pb-[620px] md:pb-[660px] lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">

          
          {/* Left column */}
          <div className="relative z-20 max-w-[400px] text-left">
            <FadeUp delay={1.0}>
              <h2 className="text-3xl sm:text-4xl font-normal tracking-[-0.02em] leading-[1.05] text-foreground">
                Learn how can one go from 0 to $11.5k with AI in 60 days.
              </h2>
            </FadeUp>
            
            <FadeUp delay={0.1}>
              <p className="mt-6 text-landing-text text-base sm:text-lg leading-[1.5] max-w-[380px]">
                Learn to turn your ideas into stunning websites with AI — the same skills agencies charge $5,000 for. Join the UI Rocket training and start building like a pro today.
              </p>
            </FadeUp>
            
            <FadeUp delay={0.2} className="mt-10">
              <PrimaryButton as="button">Start for free</PrimaryButton>
            </FadeUp>
          </div>


        </div>
      </div>

      {/* Dashboard pinned to right edge, behind grass, parallax Y */}
      <motion.div
        style={{ y: dashboardY }}
        className="absolute top-[440px] sm:top-[460px] md:top-[500px] lg:top-20 left-4 right-4 sm:left-auto sm:-right-[8%] md:-right-[10%] lg:-right-[12%] z-10 sm:w-[85%] md:w-[80%] lg:w-[68%]"
      >
        <CtaDashboardMock />
      </motion.div>

      {/* Foreground grass — in front of dashboard, parallax Y */}
      <motion.img
        src="https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1780586778/cta-bg_mlwy5s.png"
        alt=""
        aria-hidden
        style={{ y: grassY }}
        className="pointer-events-none select-none absolute left-0 right-0 bottom-[-40px] sm:bottom-[-80px] lg:bottom-[-140px] w-full z-30 object-cover"
      />
    </section>
  );
};
