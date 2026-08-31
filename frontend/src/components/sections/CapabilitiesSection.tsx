import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Lock,
  Ban,
  Scan,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export function CapabilitiesSection() {
  const mannequinVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReversing, setIsReversing] = useState(false);

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Hardware GPU-Accelerated 60FPS Smooth Ping-Pong (Left->Right & Right->Left) Loop using Canvas Buffer
  useEffect(() => {
    const video = mannequinVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animFrameId: number;
    let frames: ImageBitmap[] = [];
    let isForward = true;
    let lastCaptureTime = 0;
    let reverseIndex = 0;
    let lastReverseTime = 0;

    const loopMannequin = (now: number) => {
      if (video && video.duration && !isNaN(video.duration) && video.readyState >= 2) {
        const maxTime = Math.max(0, video.duration * 0.86);

        if (isForward) {
          if (video.paused && video.currentTime < maxTime) {
            video.play().catch(() => {});
          }

          // Capture smooth GPU ImageBitmap frame every ~32ms (30fps)
          if (now - lastCaptureTime >= 32) {
            lastCaptureTime = now;
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            createImageBitmap(canvas)
              .then((bmp) => {
                if (isForward) {
                  frames.push(bmp);
                } else {
                  bmp.close();
                }
              })
              .catch(() => {});
          }

          // Reached end of turn -> switch to smooth GPU reverse playback
          if (video.currentTime >= maxTime) {
            isForward = false;
            video.pause();
            reverseIndex = frames.length - 1;
            setIsReversing(true);
            lastReverseTime = now;
          }
        } else {
          // Play pre-captured GPU frames in reverse at buttery smooth 30fps rate
          if (now - lastReverseTime >= 32) {
            lastReverseTime = now;
            if (reverseIndex >= 0 && frames[reverseIndex]) {
              const bmp = frames[reverseIndex];
              ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
              reverseIndex--;
            } else {
              // Completed reverse turn -> cleanup frames & restart forward video turn
              isForward = true;
              frames.forEach((f) => f.close());
              frames = [];
              video.currentTime = 0;
              video.play().catch(() => {});
              setIsReversing(false);
            }
          }
        }
      }

      animFrameId = requestAnimationFrame(loopMannequin);
    };

    animFrameId = requestAnimationFrame(loopMannequin);

    return () => {
      cancelAnimationFrame(animFrameId);
      frames.forEach((f) => f.close());
    };
  }, []);

  const enforcementIcons = [
    { label: 'INTENT BINDING', icon: Lock },
    { label: 'MAX SPEND LIMIT', icon: Shield },
    { label: 'SCOPE ENFORCEMENT', icon: Scan },
    { label: 'REPLAY PROTECTION', icon: Ban },
    { label: 'ACTION VERIFICATION', icon: CheckCircle },
  ];

  return (
    <section
      id="capabilities"
      className="relative w-full bg-[#000000] text-white selection:bg-neutral-800 font-sans antialiased px-4 sm:px-6 md:px-10 lg:px-14 py-20 sm:py-24 min-h-screen flex flex-col justify-between"
    >
      {/* ── SECTION HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-neutral-400 uppercase mb-3 font-sans"
          >
            INTENTLOCK CAPABILITIES
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[48px] leading-[1.12] font-light tracking-tight text-white font-sans max-w-2xl"
          >
            Built to enforce intent. Across every transaction.
          </motion.h2>
        </div>
      </div>

      {/* ── 3-COLUMN BENTO GRID (SYNCHRONIZED COORDINATED ENTRY ANIMATION) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 grow">
        
        {/* ── CARD 01: CAPABILITY MATRIX ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl bg-black relative overflow-hidden flex flex-col justify-between p-5 md:p-6 min-h-[380px] lg:h-full border border-white/10"
        >
          {/* Hero Mannequin Video */}
          <video
            ref={mannequinVideoRef}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4"
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover object-[70%_center] opacity-60 pointer-events-none ${
              isReversing ? 'hidden' : 'block'
            }`}
          />

          {/* Canvas Frame Buffer */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover object-[70%_center] opacity-60 pointer-events-none ${
              isReversing ? 'block' : 'hidden'
            }`}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 pointer-events-none" />

          {/* Card Top Label */}
          <div className="relative z-10 flex items-center justify-center gap-2 text-[11px] tracking-[0.22em] text-white/60 uppercase font-sans font-semibold">
            <Sparkles className="h-3 w-3 stroke-[1.5]" />
            <span>CAPABILITY MATRIX</span>
            <Sparkles className="h-3 w-3 stroke-[1.5]" />
          </div>

          {/* Card Bottom: 5 Capability Items */}
          <div className="relative z-10 mt-auto pt-6 space-y-2.5 font-sans text-[11px] sm:text-xs">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-white/40 font-semibold">01</span>
              <span className="text-white/90 font-medium">INTENT BINDING</span>
              <span className="text-white/65 text-[10px] font-semibold">BOUND</span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-white/40 font-semibold">02</span>
              <span className="text-white/90 font-medium">SPEND CONTROL</span>
              <span className="text-white/65 text-[10px] font-semibold">ENFORCED</span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-white/40 font-semibold">03</span>
              <span className="text-white/90 font-medium">SCOPE CONTROL</span>
              <span className="text-white/65 text-[10px] font-semibold">ENFORCED</span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-white/40 font-semibold">04</span>
              <span className="text-white/90 font-medium">REPLAY PROTECTION</span>
              <span className="text-white/65 text-[10px] font-semibold">BLOCKED</span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <span className="text-white/40 font-semibold">05</span>
              <span className="text-white/90 font-medium">ACTION VERIFICATION</span>
              <span className="text-white/65 text-[10px] font-semibold">VERIFIED</span>
            </div>
          </div>
        </motion.div>

        {/* ── COLUMN 2: CARD 02 & CARD 03 ── */}
        <div className="flex flex-col gap-4 md:gap-5">
          
          {/* Card 02: INTENT BINDING */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-2xl bg-[#0d0d0d] p-5 md:p-6 noise-overlay relative flex flex-col justify-between min-h-[240px] lg:h-[250px] border border-white/10 overflow-hidden"
          >
            <div className="relative z-10 flex items-center gap-2 text-[11px] tracking-[0.22em] text-white/60 uppercase font-sans font-semibold mb-2">
              <Sparkles className="h-3 w-3 stroke-[1.5]" />
              <span>INTENT BINDING</span>
            </div>

            <h3 className="relative z-10 text-base sm:text-lg font-bold text-white/90 tracking-tight leading-[1.25] mb-1 font-sans">
              TURN INTENT INTO AUTHORIZATION
            </h3>

            <p className="relative z-10 text-xs sm:text-[13px] leading-[1.5] text-white/65 font-sans mb-3">
              IntentLock converts what the user actually authorizes into explicit boundaries an autonomous agent must follow.
            </p>

            <div className="relative z-10 bg-black/60 border border-white/10 rounded-xl p-3 font-sans text-[10.5px] sm:text-[11px] space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">ACTION</span>
                <span className="text-white/90 font-bold">PURCHASE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">AUTHORIZED LIMIT</span>
                <span className="text-white/90 font-bold text-emerald-400">₹1,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">TARGET</span>
                <span className="text-white/90 font-medium">WIRELESS MOUSE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">REUSE</span>
                <span className="text-white/80 font-medium">NOT PERMITTED</span>
              </div>
            </div>

            <div className="relative z-10 text-[10px] font-sans tracking-wider text-white/70 uppercase border-t border-white/10 pt-2 flex justify-between font-semibold">
              <span className="text-white/40">STATUS</span>
              <span className="font-bold text-emerald-400">INTENT BOUND</span>
            </div>
          </motion.div>

          {/* Card 03: ENFORCEMENT COUNT */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.11 }}
            className="rounded-2xl bg-black relative overflow-hidden flex flex-col justify-between items-center text-center p-5 md:p-6 min-h-[240px] lg:h-[250px] grow border border-white/10"
          >
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_154543_d5b83fc1-9cea-44f3-b5e8-8f325935211a.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
            />

            <div className="absolute inset-0 bg-black/45 pointer-events-none" />

            <div className="relative z-10 my-auto py-2">
              <span className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-light tracking-tight text-white/95 leading-none block font-sans">
                5
              </span>
            </div>

            <div className="relative z-10 space-y-1">
              <p className="text-xs sm:text-sm text-white/90 font-bold tracking-wider uppercase font-sans">
                CORE ENFORCEMENT LAYERS
              </p>
              <p className="text-[10px] sm:text-[11px] font-sans font-semibold text-white/60 tracking-wider uppercase">
                INTENT · LIMIT · SCOPE · REPLAY · VERIFICATION
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── COLUMN 3: CARD 04 & CARD 05 ── */}
        <div className="flex flex-col gap-4 md:gap-5">
          
          {/* Card 04: ENFORCEMENT LAYERS */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.14 }}
            className="rounded-2xl bg-black relative overflow-hidden p-5 md:p-6 flex flex-col justify-between min-h-[240px] lg:h-[250px] border border-white/10"
          >
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_153148_d7a3e1dd-e5d0-4ce6-8306-00d7522ecc44.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between text-[11px] tracking-[0.22em] text-white/60 uppercase font-sans font-semibold mb-4">
              <span>ENFORCEMENT LAYERS</span>
              <Sparkles className="h-3 w-3 stroke-[1.5]" />
            </div>

            {/* Marquee Container */}
            <div className="relative z-10 space-y-3 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              {/* Row 1: Scroll Left */}
              <div className="flex gap-3 w-max animate-marquee-left">
                {[...enforcementIcons, ...enforcementIcons].map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white/5 backdrop-blur-md px-3.5 h-10 rounded-xl flex items-center gap-2 shrink-0 border border-white/10 text-white/80 font-sans font-medium text-[11px]"
                    >
                      <IconComp className="h-3.5 w-3.5 stroke-[1.5] text-white/70" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Row 2: Scroll Right */}
              <div className="flex gap-3 w-max animate-marquee-right">
                {[...enforcementIcons, ...enforcementIcons].reverse().map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white/5 backdrop-blur-md px-3.5 h-10 rounded-xl flex items-center gap-2 shrink-0 border border-white/10 text-white/80 font-sans font-medium text-[11px]"
                    >
                      <IconComp className="h-3.5 w-3.5 stroke-[1.5] text-white/70" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 text-[10px] font-sans tracking-wider text-white/70 uppercase border-t border-white/10 pt-2 flex justify-between font-semibold">
              <span className="text-white/40">ENGINE</span>
              <span className="font-bold text-white/90">21 RULES</span>
            </div>
          </motion.div>

          {/* Card 05: ZERO TRUST ENFORCEMENT */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.17 }}
            className="rounded-2xl bg-[#0d0d0d] p-5 md:p-6 noise-overlay relative flex flex-col justify-between min-h-[240px] lg:h-[250px] grow border border-white/10 overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-between text-[11px] tracking-[0.22em] text-white/60 uppercase font-sans font-semibold mb-2">
              <span>ZERO TRUST</span>
              <Sparkles className="h-3 w-3 stroke-[1.5]" />
            </div>

            <h3 className="relative z-10 text-base sm:text-lg font-bold text-white/90 tracking-tight leading-[1.25] mb-1 font-sans">
              NO UNCHECKED EXECUTIONS
            </h3>

            <p className="relative z-10 text-xs sm:text-[13px] leading-[1.5] text-white/65 font-sans mb-3">
              If an agent action violates spending limits, unapproved merchants, or scope rules, IntentLock blocks it instantly.
            </p>

            <div className="relative z-10 bg-black/60 border border-white/10 rounded-xl p-3 font-sans text-[10.5px] sm:text-[11px] space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">PRICE ESCALATION</span>
                <span className="text-rose-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">UNAPPROVED SKU</span>
                <span className="text-rose-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45 font-semibold">UNAUTHORIZED VENDOR</span>
                <span className="text-rose-400 font-bold">BLOCKED</span>
              </div>
            </div>

            <div className="relative z-10 text-[10px] font-sans tracking-wider text-white/70 uppercase border-t border-white/10 pt-2 flex justify-between font-semibold">
              <span className="text-white/40">POLICY</span>
              <span className="font-bold text-white/90">ZERO TOLERANCE</span>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
