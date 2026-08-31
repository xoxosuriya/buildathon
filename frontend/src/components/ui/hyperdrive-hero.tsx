import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Rocket } from 'lucide-react';

interface HyperdriveHeroProps {
  onCtaClick?: () => void;
  badgeText?: string;
  headlineText?: string;
  supportingText?: string;
  buttonText?: string;
}

// Light-Theme Hyperspace Starfield Canvas Component
const StarfieldCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];
    const numStars = 700;
    let speed = 2.2;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Star {
      x: number;
      y: number;
      z: number;
      pz: number;

      constructor() {
        this.x = Math.random() * (canvas?.width || 1000) - (canvas?.width || 1000) / 2;
        this.y = Math.random() * (canvas?.height || 800) - (canvas?.height || 800) / 2;
        this.z = Math.random() * (canvas?.width || 1000);
        this.pz = this.z;
      }

      update() {
        if (!canvas) return;
        this.z = this.z - speed;
        if (this.z < 1) {
          this.z = canvas.width;
          this.x = Math.random() * canvas.width - canvas.width / 2;
          this.y = Math.random() * canvas.height - canvas.height / 2;
          this.pz = this.z;
        }
      }

      draw() {
        if (!canvas || !ctx) return;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const sx = (this.x / this.z) * cx + cx;
        const sy = (this.y / this.z) * cy + cy;

        const r = Math.max(0.15, (1 - this.z / canvas.width) * 2.2);

        const px = (this.x / this.pz) * cx + cx;
        const py = (this.y / this.pz) * cy + cy;

        this.pz = this.z;

        // Dark charcoal streak lines over light off-white canvas
        const alpha = Math.min(0.85, Math.max(0.04, (1 - this.z / canvas.width) * 0.9));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.lineWidth = r * 2.2;
        ctx.strokeStyle = `rgba(18, 18, 26, ${alpha})`;
        ctx.stroke();
      }
    }

    const init = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
      }
    };

    const animate = () => {
      // Soft trail clear using the light background color #F7F7F9
      ctx.fillStyle = 'rgba(247, 247, 249, 0.28)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const dist = Math.abs(event.clientX - centerX);
      const maxDist = window.innerWidth / 2;
      speed = 2.0 + (1 - dist / maxDist) * 18;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    resizeCanvas();
    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full pointer-events-none" />;
};

export default function HyperdriveHero({
  onCtaClick,
  badgeText = 'INTENT-BOUND AUTHORIZATION',
  headlineText = 'Give AI the freedom to act.\nKeep the boundary yours.',
  supportingText = 'Let autonomous agents act with confidence — while every transaction remains bound to what you actually authorized.',
  buttonText = 'Try Live Demo',
}: HyperdriveHeroProps) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.18 + 0.1,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    }),
  };

  return (
    <section className="relative min-h-[85vh] lg:min-h-screen w-full bg-[#F7F7F9] flex flex-col items-center justify-center overflow-hidden antialiased selection:bg-neutral-900 selection:text-white">
      {/* Light Starfield Hyperspace Canvas */}
      <StarfieldCanvas />

      {/* Subtle Light Vignette Radial Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(247,247,249,0.85)_100%)] z-10 pointer-events-none" />

      {/* Overlay HTML Content */}
      <div className="relative z-20 text-center px-6 py-20 max-w-5xl mx-auto flex flex-col items-center">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-neutral-300/80 mb-8 backdrop-blur-md shadow-sm select-none"
        >
          <Rocket className="h-4 w-4 text-neutral-800 shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-neutral-800 font-sans tracking-wide">
            {badgeText}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-light tracking-tight leading-[1.08] mb-6 text-neutral-900 font-sans whitespace-pre-wrap select-none"
        >
          {headlineText}
        </motion.h1>

        {/* Supporting Copy */}
        <motion.p
          custom={2}
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-neutral-600 font-normal leading-relaxed mb-10 font-sans"
        >
          {supportingText}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          custom={3}
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <button
            onClick={onCtaClick}
            className="px-8 py-4 bg-neutral-900 text-white font-medium text-base rounded-full shadow-xl hover:bg-neutral-800 active:bg-black transition-all duration-200 flex items-center gap-2.5 mx-auto cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{buttonText}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
