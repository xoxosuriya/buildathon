import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// High quality abstract videos for animated card backgrounds (matching reference photo)
const CARD_VIDEOS = [
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_171347_f640c30d-ec21-426a-98bc-77e07c2c60cb.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4',
];

// 7 Card Stack Data: 1 Decorative Top + 5 IntentLock Security Pipeline Content Cards + 1 Decorative Bottom
const CARD_STACK_ITEMS = [
  {
    // Index 0: Decorative Top Card (Visual Depth Only)
    isDecorative: true,
    step: 'INTENTLOCK SYSTEM',
    title: 'AUTHORIZATION ENGINE',
    desc: 'System visual depth card.',
    number: '3819 4012 9918 2041',
    contractHash: '0x3819...SYSTEM_DEPTH_TOP',
  },
  {
    // Index 1: STEP 01 — DEFINE INTENT
    isDecorative: false,
    step: 'STEP 01 — DEFINE INTENT',
    title: 'DEFINE THE INTENT',
    desc: 'Capture exactly what the user wants the autonomous agent to do before the agent is allowed to act.',
    rows: [
      { label: 'ACTION:', val: 'PURCHASE' },
      { label: 'LIMIT:', val: '₹1,500' },
      { label: 'TARGET / REUSE:', val: 'NOT PERMITTED' },
    ],
    status: 'INTENT BOUNDARY DEFINED',
    statusColor: 'text-white',
    number: '4232 8908 1121 4892',
    contractHash: '0x9041...INTENT_DEFINE',
  },
  {
    // Index 2: STEP 02 — LOCK BOUNDARY
    isDecorative: false,
    step: 'STEP 02 — LOCK BOUNDARY',
    title: 'LOCK THE BOUNDARY',
    desc: 'Convert authorization into enforceable limits that the agent cannot exceed.',
    rows: [
      { label: 'ACTION:', val: 'PURCHASE' },
      { label: 'BOUNDED LIMIT:', val: '₹1,500' },
      { label: 'REUSE:', val: 'DENIED', isRed: true },
    ],
    status: 'BOUNDARY ENFORCED',
    statusColor: 'text-red-500',
    number: '4154 7831 9904 5124',
    contractHash: '0x8820...LIMIT_LOCK',
  },
  {
    // Index 3: STEP 03 — VERIFY ACTION
    isDecorative: false,
    step: 'STEP 03 — VERIFY ACTION',
    title: 'VERIFY THE ACTION',
    desc: "Before execution, IntentLock checks the agent's proposed action against the original authorization.",
    rows: [
      { label: 'REQUESTED ACTION:', val: 'PURCHASE' },
      { label: 'REQUESTED AMOUNT:', val: '₹1,499' },
      { label: 'AUTHORIZED LIMIT:', val: '₹1,500' },
      { label: 'SCOPE:', val: 'MATCH' },
    ],
    status: 'ACTION VERIFIED',
    statusColor: 'text-white',
    number: '5457 4120 7733 9035',
    contractHash: '0x4109...ACTION_VERIFY',
  },
  {
    // Index 4: STEP 04 — EXECUTE WITHIN SCOPE
    isDecorative: false,
    step: 'STEP 04 — EXECUTE WITHIN SCOPE',
    title: 'EXECUTE WITHIN SCOPE',
    desc: 'Only an action that satisfies every authorization constraint is allowed to reach execution.',
    rows: [
      { label: 'INTENT → VERIFY → AUTHORIZE →', val: 'EXECUTE' },
      { label: 'AUTHORIZED PURCHASE:', val: '₹1,499' },
      { label: 'LIMIT / SCOPE:', val: '₹1,500 · VALID' },
    ],
    status: 'EXECUTION ALLOWED',
    statusColor: 'text-white',
    number: '6812 9901 3341 8021',
    contractHash: '0x6812...ENFORCE_EXECUTE',
  },
  {
    // Index 5: STEP 05 — SETTLE & AUDIT
    isDecorative: false,
    step: 'STEP 05 — SETTLE & AUDIT',
    title: 'SETTLE THE ACTION',
    desc: 'Once the authorized action completes, the capability is consumed and recorded as the final authorized outcome.',
    rows: [
      { label: 'TRANSACTION:', val: 'WIRELESS MOUSE' },
      { label: 'AMOUNT:', val: '₹1,499' },
      { label: 'AUTHORIZATION:', val: 'SINGLE-USE' },
    ],
    status: 'SETTLED — CAPABILITY CONSUMED',
    statusColor: 'text-white',
    number: '8810 4429 1190 6732',
    contractHash: '0x8810...SETTLE_AUDIT',
  },
  {
    // Index 6: Decorative Bottom Card (Visual Depth Only)
    isDecorative: true,
    step: 'INTENTLOCK VAULT',
    title: 'ZERO-TRUST GATEWAY',
    desc: 'System visual depth card.',
    number: '9920 1148 7723 3019',
    contractHash: '0x9920...SYSTEM_DEPTH_BOTTOM',
  },
];

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameId = useRef<number>(0);
  
  const stepRef = useRef<number>(0); // 0..4 (Step 01..Step 05)
  const animProgress = useRef<number>(0); // Lerped 0.0 -> 1.0
  const isCoolingDown = useRef<boolean>(false);
  const accumDeltaY = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const [activeStepIndex, setActiveStepIndex] = useState(0); // 0..4 (Steps 1..5)
  const [metrics, setMetrics] = useState({ cardW: 550, cardH: 345 });

  // Mouse Parallax tracking with inertia damping
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const ry = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      mouse.current.targetX = Math.max(-1, Math.min(1, rx));
      mouse.current.targetY = Math.max(-1, Math.min(1, ry));
    };

    const handleMouseLeave = () => {
      mouse.current.targetX = 0;
      mouse.current.targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Calculate card dimensions responsively
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      let cardW = 550;
      if (w < 640) {
        cardW = Math.min(320, w - 32);
      } else if (w < 1024) {
        cardW = 440;
      } else {
        const heightScale = Math.min(1.0, Math.max(0.8, h / 850));
        cardW = Math.round(550 * heightScale);
      }

      const cardH = Math.round(cardW / 1.5925);
      setMetrics({ cardW, cardH });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // PERFECT FREEZE & UNPIN WHEEL STATE MACHINE WITH CLEAN SECTION RELEASE
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowH = window.innerHeight;

      // Active range: section is near top of screen
      const isInActiveZone = rect.top <= 120 && rect.bottom >= windowH - 120;
      if (!isInActiveZone) return;

      const isDown = e.deltaY > 0;
      const isUp = e.deltaY < 0;

      // Case 1: Active card progression inside section (Steps 0..4)
      const canStepDown = isDown && stepRef.current < 4;
      const canStepUp = isUp && stepRef.current > 0;

      if (canStepDown || canStepUp) {
        // FREEZE PAGE MOVEMENT IMMEDIATELY DURING STEP ANIMATION
        e.preventDefault();

        // Snap window position instantly to rect.top === 0 so header is 100% perfectly framed like Image 1
        if (Math.abs(rect.top) > 5) {
          window.scrollTo({
            top: window.scrollY + rect.top,
            behavior: 'instant' as ScrollBehavior,
          });
        }

        if (isCoolingDown.current) return;

        accumDeltaY.current += e.deltaY;

        if (Math.abs(accumDeltaY.current) > 20) {
          if (isDown && stepRef.current < 4) {
            stepRef.current += 1;
            setActiveStepIndex(stepRef.current);
          } else if (isUp && stepRef.current > 0) {
            stepRef.current -= 1;
            setActiveStepIndex(stepRef.current);
          }

          accumDeltaY.current = 0;
          isCoolingDown.current = true;
          setTimeout(() => {
            isCoolingDown.current = false;
          }, 280); // 280ms smooth step cooldown
        }
        return;
      }

      // Case 2: At Step 4 (Step 05 SETTLE) and user scrolls DOWN to proceed to NEXT section
      if (isDown && stepRef.current === 4) {
        if (isCoolingDown.current) {
          e.preventDefault();
          return;
        }
        accumDeltaY.current += e.deltaY;
        if (accumDeltaY.current > 25) {
          accumDeltaY.current = 0;
          isCoolingDown.current = true;
          const nextSectionTop = containerRef.current.offsetTop + containerRef.current.offsetHeight;
          window.scrollTo({ top: nextSectionTop, behavior: 'smooth' });
          setTimeout(() => {
            isCoolingDown.current = false;
          }, 450);
        }
      }

      // Case 3: At Step 0 (Step 01 DEFINE INTENT) and user scrolls UP to return to PREVIOUS section
      if (isUp && stepRef.current === 0) {
        if (isCoolingDown.current) {
          e.preventDefault();
          return;
        }
        accumDeltaY.current += e.deltaY;
        if (Math.abs(accumDeltaY.current) > 25) {
          accumDeltaY.current = 0;
          isCoolingDown.current = true;
          const prevSectionTop = Math.max(0, containerRef.current.offsetTop - window.innerHeight);
          window.scrollTo({ top: prevSectionTop, behavior: 'smooth' });
          setTimeout(() => {
            isCoolingDown.current = false;
          }, 450);
        }
      }
    };

    // Touch support for mobile devices
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowH = window.innerHeight;
      const isInActiveZone = rect.top <= 120 && rect.bottom >= windowH - 120;
      if (!isInActiveZone) return;

      const currentY = e.touches[0].clientY;
      const diffY = touchStartY.current - currentY; // Positive = scroll down

      const isDown = diffY > 0;
      const isUp = diffY < 0;

      const canStepDown = isDown && stepRef.current < 4;
      const canStepUp = isUp && stepRef.current > 0;

      if (canStepDown || canStepUp) {
        e.preventDefault();

        if (Math.abs(rect.top) > 5) {
          window.scrollTo({
            top: window.scrollY + rect.top,
            behavior: 'instant' as ScrollBehavior,
          });
        }

        if (isCoolingDown.current) return;

        if (Math.abs(diffY) > 25) {
          if (isDown && stepRef.current < 4) {
            stepRef.current += 1;
            setActiveStepIndex(stepRef.current);
          } else if (isUp && stepRef.current > 0) {
            stepRef.current -= 1;
            setActiveStepIndex(stepRef.current);
          }

          touchStartY.current = currentY;
          isCoolingDown.current = true;
          setTimeout(() => {
            isCoolingDown.current = false;
          }, 280);
        }
      } else if (isDown && stepRef.current === 4 && Math.abs(diffY) > 30) {
        const nextSectionTop = containerRef.current.offsetTop + containerRef.current.offsetHeight;
        window.scrollTo({ top: nextSectionTop, behavior: 'smooth' });
      } else if (isUp && stepRef.current === 0 && Math.abs(diffY) > 30) {
        const prevSectionTop = Math.max(0, containerRef.current.offsetTop - window.innerHeight);
        window.scrollTo({ top: prevSectionTop, behavior: 'smooth' });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Reset How It Works step to 01 when navigating via Hero or Footer entry points
  useEffect(() => {
    const handleResetStep = () => {
      stepRef.current = 0;
      animProgress.current = 0;
      setActiveStepIndex(0);
    };
    (window as any).__resetHowItWorksStep = handleResetStep;
    window.addEventListener('reset-how-it-works', handleResetStep);
    return () => {
      delete (window as any).__resetHowItWorksStep;
      window.removeEventListener('reset-how-it-works', handleResetStep);
    };
  }, []);

  // 60FPS ANIMATION LOOP
  useEffect(() => {
    const renderLoop = () => {
      // Lerp progress smoothly towards target step (stepRef.current / 4)
      const targetP = stepRef.current / 4; // 0.0, 0.25, 0.50, 0.75, 1.00
      animProgress.current += (targetP - animProgress.current) * 0.12;

      // Smooth mouse inertia damping
      mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
      mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;

      const cards = cardsRefs.current;
      const currentSectionProgress = animProgress.current; // 0.0 -> 1.0

      // Map 0.0 -> 1.0 progress over the 5 content steps (0 = Step 1 active, 1 = Step 2 active, ..., 4 = Step 5 active)
      const mappedStep = currentSectionProgress * 4.0; // 0.0 -> 4.0

      // In CARD_STACK_ITEMS array: Index 1 = Step 01, Index 2 = Step 02, Index 3 = Step 03, Index 4 = Step 04, Index 5 = Step 05
      // Target active card index in 7-card array: activeCardIndex = 1 + mappedStep
      const activeCardIndex = 1 + mappedStep;

      for (let i = 0; i < 7; i++) {
        const card = cards[i];
        if (!card) continue;

        // Offset from active card index along vertical deck path
        const offset = i - activeCardIndex;
        const absOffset = Math.abs(offset);

        // VERTICAL FALLING DECK MATH (PINNED SCENE, SINGLE VERTICAL CENTER AXIS)
        const y = offset * 215; // Vertical offset with natural card overlap
        const z = -absOffset * 270; // Recedes smoothly into 3D depth behind active center card
        const scale = Math.max(0.72, 1 - absOffset * 0.13); // Center active card scale = 1.0
        const opacity = Math.max(0, 1 - absOffset * 0.36); // Clean fade out for receding cards

        // Bounded subtle physical tilts (NO 180° rotations, NO cylinder flips!)
        const localRotX = -offset * 7; // Max ±14° tilt along X axis
        const localRotZ = -offset * 3; // Subtle organic Z tilt

        // Mouse parallax (active center card receives subtle interactive tilt)
        const centerFactor = Math.max(0, 1 - absOffset * 1.5);
        const tiltX = -mouse.current.y * 5 * centerFactor;
        const tiltY = mouse.current.x * 6 * centerFactor;

        const totalRotX = localRotX + tiltX;
        const totalRotY = tiltY;
        const totalRotZ = localRotZ;

        card.style.zIndex = Math.round(300 - absOffset * 100).toString();
        card.style.opacity = opacity.toFixed(3);
        card.style.transform = `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${totalRotX.toFixed(2)}deg) rotateY(${totalRotY.toFixed(2)}deg) rotateZ(${totalRotZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      }

      frameId.current = requestAnimationFrame(renderLoop);
    };

    frameId.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(frameId.current);
  }, [metrics]);

  // Physical 3D thickness layers (Span -1.47px to 1.47px creates real 3D volume thickness)
  const thicknessLayers = [-1.47, -0.73, 0, 0.73, 1.47];

  const STEP_PILLS = [
    '01 DEFINE INTENT',
    '02 LOCK BOUNDARY',
    '03 VERIFY ACTION',
    '04 EXECUTE IN SCOPE',
    '05 SETTLE',
  ];

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative w-full bg-[#000000] text-white select-none h-screen py-4 sm:py-6 flex flex-col justify-between items-center overflow-hidden"
    >
      <div className="w-full h-full flex flex-col justify-between items-center px-4 sm:px-6 md:px-10">
        
        {/* Section Header (STAYS PINNED & VISIBLE AT EXACT POSITION LIKE IMAGE 1) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center z-20 relative max-w-[1400px] w-full pt-2"
        >
          <p className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-neutral-400 uppercase mb-2 select-none">
            HOW INTENTLOCK WORKS
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight mb-3 leading-tight">
            FROM INTENT TO AUTHORIZED ACTION.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base md:text-lg font-normal max-w-xl mx-auto leading-relaxed">
            IntentLock translates what the user authorizes into enforceable boundaries before an autonomous agent can act.
          </p>

          {/* Active 5-Step Indicator Pills (CLICKABLE TO SWITCH STEPS IMMEDIATELY) */}
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mt-5">
            {STEP_PILLS.map((label, idx) => {
              const isActive = activeStepIndex === idx;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    stepRef.current = idx;
                    setActiveStepIndex(idx);
                  }}
                  className={`text-xs sm:text-[12px] font-mono tracking-wider px-3.5 sm:px-4 py-2 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'border-2 border-white text-white bg-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.25)] ring-2 ring-white/30 scale-105 font-bold'
                      : 'border border-neutral-800 text-neutral-400 bg-black/40 hover:border-neutral-700 hover:text-neutral-200 font-medium'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── 3D VERTICAL FALLING CARD DECK STAGE (CARDS SHIFTED LOWER) ── */}
        <div className="relative w-full max-w-[1300px] h-[520px] sm:h-[580px] flex items-center justify-center pointer-events-none mt-2 sm:mt-4 pb-4">
          <div
            className="relative w-full h-full flex items-center justify-center translate-y-10 sm:translate-y-14"
            style={{ perspective: '1350px' }}
          >
            <div
              className="absolute"
              style={{
                width: `${metrics.cardW}px`,
                height: `${metrics.cardH}px`,
                transformStyle: 'preserve-3d',
              }}
            >
              {CARD_STACK_ITEMS.map((cardData, i) => {
                const videoSrc = CARD_VIDEOS[i % CARD_VIDEOS.length];
                const isStepActive = !cardData.isDecorative && activeStepIndex === i - 1;

                return (
                  <div
                    key={i}
                    ref={(el) => { cardsRefs.current[i] = el; }}
                    className="absolute inset-0 pointer-events-auto cursor-pointer"
                    onClick={() => {
                      if (!cardData.isDecorative) {
                        const targetStep = i - 1;
                        stepRef.current = targetStep;
                        setActiveStepIndex(targetStep);
                      }
                    }}
                    style={{
                      width: `${metrics.cardW}px`,
                      height: `${metrics.cardH}px`,
                      transformStyle: 'preserve-3d',
                      backfaceVisibility: 'visible',
                    }}
                  >
                    {/* Dense parallel volumetric 3D thickness layering */}
                    {thicknessLayers.map((zOffset, layerIdx) => {
                      const isFrontFace = layerIdx === thicknessLayers.length - 1;
                      const isBackFace = layerIdx === 0;

                      // Structural middle slice
                      if (!isFrontFace && !isBackFace) {
                        return (
                          <div
                            key={layerIdx}
                            className="absolute inset-0 rounded-[20px] border border-[#808080] pointer-events-none overflow-hidden"
                            style={{
                              backgroundColor: '#808080',
                              transform: `translateZ(${zOffset}px)`,
                            }}
                          />
                        );
                      }

                      // FRONT FACE SLICE — Realistic Physical Security Card
                      if (isFrontFace) {
                        return (
                          <div
                            key={layerIdx}
                            className={`absolute inset-0 rounded-[20px] overflow-hidden bg-[#0f0f0f] shadow-2xl transition-all duration-300 hover:border-white/40 ${
                              isStepActive
                                ? 'border-2 border-white shadow-[0_0_35px_rgba(255,255,255,0.25)]'
                                : 'border border-white/20'
                            }`}
                            style={{
                              transform: `translateZ(${zOffset}px)`,
                              backfaceVisibility: 'hidden',
                              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 20px 40px rgba(0,0,0,0.95)',
                            }}
                          >
                            {/* Floating Active Stage Badge Indicator */}
                            {isStepActive && (
                              <div className="absolute -top-11 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-white text-black font-mono text-[11px] font-bold shadow-2xl uppercase tracking-wider flex items-center gap-2 z-30 border border-white/50 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span>ACTIVE STAGE: {cardData.step}</span>
                              </div>
                            )}
                            {/* Autoplaying animated video background inside card */}
                            <video
                              src={videoSrc}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover rounded-[20px]"
                            />

                            {/* Dark tint overlay */}
                            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-0" />

                            {/* Card Content & Features */}
                            <div className="relative z-10 p-6 sm:p-7 text-white h-full w-full font-sans flex flex-col justify-between">
                              
                              {/* Top Row: Metallic EMV Chip + IntentLock Brand Watermark */}
                              <div className="flex justify-between items-start">
                                {/* Silver Metallic Contact Chip SVG */}
                                <div className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px]">
                                  <svg
                                    className="w-full h-full"
                                    viewBox="0 0 60 60"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M20 8H40V14C40.0016 14.5299 40.2128 15.0377 40.5875 15.4125C40.9623 15.7872 41.4701 15.9984 42 16H59V24H42C41.4701 24.0016 40.9623 24.2128 40.5875 24.5875C40.2128 24.9623 40.0016 25.4701 40 26V52H20V8ZM18 8H8.00039C4.47435 8 1.56576 10.6083 1.08 14H18V8ZM1 16V24V26V34V36V44H18V36H1V34H18V26H1V24H18V16H1ZM1.08 46C1.56576 49.3917 4.47435 52 8.00039 52H18V46H1.08ZM42 14V8H52.0004C55.5264 8 58.4342 10.6084 58.92 14H42ZM59 26H42V34H59V26ZM59 36H42V44H59V36ZM52.0004 52H42V46H58.92C58.4342 49.3916 55.5264 52 52.0004 52Z"
                                      fill={`url(#paint0_chip_v15_${i})`}
                                    />
                                    <defs>
                                      <linearGradient
                                        id={`paint0_chip_v15_${i}`}
                                        x1="30"
                                        y1="8"
                                        x2="30"
                                        y2="52"
                                        gradientUnits="userSpaceOnUse"
                                      >
                                        <stop stopColor="white" />
                                        <stop offset="1" stopColor="#999999" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                </div>

                                {/* IntentLock Brand Watermark */}
                                <div className="text-right">
                                  <span className="font-mono text-[11px] sm:text-xs font-bold tracking-[0.2em] text-white/90 uppercase block">
                                    INTENTLOCK®
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] font-mono text-white/60 tracking-wider block">
                                    SECURITY CONSOLE
                                  </span>
                                </div>
                              </div>

                              {/* Center Console Content */}
                              <div className="my-1 sm:my-2">
                                <span className="block text-[10px] sm:text-[11px] font-mono tracking-widest text-white/70 uppercase mb-1">
                                  {cardData.step}
                                </span>
                                <h3 className="text-base sm:text-lg font-medium text-white leading-tight mb-2">
                                  {cardData.title}
                                </h3>
                                
                                {!cardData.isDecorative ? (
                                  /* IntentLock Console Content Data */
                                  <div className="bg-black/70 border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col gap-1.5 text-[11px] sm:text-xs font-mono backdrop-blur-md">
                                    {cardData.rows?.map((row, rIdx) => (
                                      <div key={rIdx} className="flex justify-between items-center">
                                        <span className="text-white/60">{row.label}</span>
                                        <span className={row.isRed ? 'text-red-500 font-semibold' : 'text-white font-semibold'}>
                                          {row.val}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* Decorative Card Visual Placeholder */
                                  <div className="bg-black/40 border border-white/10 rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-[11px] font-mono text-white/40 backdrop-blur-md">
                                    <span>SYSTEM VISUAL DEPTH</span>
                                    <span>ENFORCED</span>
                                  </div>
                                )}
                              </div>

                              {/* Bottom Row: Status Line + Intersecting Circles Logo */}
                              <div className="flex justify-between items-end pt-2 border-t border-white/15 text-[10px] sm:text-[11px] font-mono">
                                <div>
                                  <span className="text-white/60 block text-[9px]">STATUS</span>
                                  <span className={`font-semibold ${cardData.statusColor || 'text-white/80'}`}>
                                    {cardData.isDecorative ? 'DEPTH CONTEXT' : cardData.status}
                                  </span>
                                </div>

                                {/* Intersecting Circles Brand Mark */}
                                <div className="flex -space-x-2 items-center opacity-90">
                                  <div className="w-5 h-5 rounded-full bg-white/30 backdrop-blur-[1px] border border-white/20" />
                                  <div className="w-5 h-5 rounded-full bg-white/50 backdrop-blur-[1px] border border-white/20" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // BACK FACE SLICE — Realistic Card Back Face
                      if (isBackFace) {
                        return (
                          <div
                            key={layerIdx}
                            className="absolute inset-0 rounded-[20px] border border-white/20 pointer-events-none overflow-hidden bg-[#0f0f0f] text-white p-6 flex flex-col justify-between"
                            style={{
                              transform: `translateZ(${zOffset}px) rotateY(180deg)`,
                              backfaceVisibility: 'hidden',
                              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25)',
                            }}
                          >
                            <div className="absolute inset-0 pointer-events-none" style={{ filter: 'blur(16px)', transform: 'scale(1.15)' }}>
                              <video
                                src={videoSrc}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover opacity-40"
                              />
                            </div>

                            <div className="absolute left-0 right-0 top-5 h-8 bg-black/90 backdrop-blur-md z-10 border-y border-white/10" />

                            <div className="relative z-20 mt-12 font-mono text-[10px] flex flex-col gap-1 text-left">
                              <div className="text-white/90 font-medium tracking-[0.14em]">
                                {cardData.number}
                              </div>
                              <div className="text-white/60 text-[9px] flex items-center gap-2">
                                <span className="uppercase">INTENTLOCK AUTH</span>
                                <span className="text-white/30">•</span>
                                <span>HASH: {cardData.contractHash}</span>
                              </div>
                            </div>

                            <div className="relative z-20 font-mono text-[10px] text-white/70 flex justify-between items-center border-t border-white/15 pt-2">
                              <span>SECURITY TOKEN</span>
                              <span className="text-white font-semibold">ENFORCED</span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
