import { useEffect, useRef } from 'react';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4';

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const targetTimeRef = useRef<number>(0);
  const targetXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const targetYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  
  const hasPointerMovedRef = useRef<boolean>(false);
  const lastSeekTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Hardware GPU-accelerated video playback & cursor tracking
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;

    // Passive mousemove listener updating normalized coordinates (0ms latency)
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      if (!video.duration || isNaN(video.duration)) return;

      // Mark that user has performed real mouse movement
      hasPointerMovedRef.current = true;

      const normX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const normY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

      targetXRef.current = Math.max(-1, Math.min(1, normX));
      targetYRef.current = Math.max(-1, Math.min(1, normY));

      const startX = window.innerWidth * 0.38;
      const maxScrubTime = Math.max(0, video.duration * 0.86);

      if (e.clientX <= startX) {
        targetTimeRef.current = 0;
      } else {
        const progress = Math.min(1, Math.max(0, (e.clientX - startX) / (window.innerWidth - startX)));
        targetTimeRef.current = progress * maxScrubTime;
      }
    };

    let lastTime = performance.now();

    // 60FPS Hardware Video Render Loop
    const updateFrame = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      if (
        window.innerWidth >= 1024 &&
        video &&
        video.duration &&
        !isNaN(video.duration) &&
        video.readyState >= 2
      ) {
        // Smooth responsive lerp for 3D parallax container
        if (hasPointerMovedRef.current) {
          const lerpFactor = Math.min(1, 0.35 * (delta / 16.66));
          currentXRef.current += (targetXRef.current - currentXRef.current) * lerpFactor;
          currentYRef.current += (targetYRef.current - currentYRef.current) * lerpFactor;
        }

        // Apply instant 3D hardware parallax transform to video container on GPU layer
        if (container) {
          const translateX = (currentXRef.current * 18).toFixed(2);
          const translateY = (currentYRef.current * 10).toFixed(2);
          const rotateY = (currentXRef.current * 4).toFixed(2);

          container.style.transform = `translate3d(${translateX}px, ${translateY}px, 0px) rotateY(${rotateY}deg)`;
        }

        // Scrub video timestamp ONLY after user pointer movement
        if (hasPointerMovedRef.current) {
          const maxTime = Math.max(0, video.duration * 0.86);
          const diff = targetTimeRef.current - video.currentTime;

          if (diff > 0.05) {
            // Moving forward / turning right -> smooth hardware playback at dynamic rate
            const rate = Math.min(3.5, Math.max(1.0, diff * 3.0));
            video.playbackRate = rate;
            if (video.paused && video.currentTime < maxTime) {
              video.play().catch(() => {});
            }
          } else if (diff < -0.05) {
            // Moving backward / turning left -> throttled 30 FPS seek step to prevent decoder stalls
            if (!video.paused) {
              video.pause();
            }
            if (now - lastSeekTimeRef.current >= 33) {
              lastSeekTimeRef.current = now;
              video.currentTime = Math.max(0, video.currentTime + diff * 0.5);
            }
          } else {
            // Reached target pose -> pause cleanly
            if (!video.paused) {
              video.pause();
            }
          }

          // Hard clamp safety
          if (video.currentTime >= maxTime) {
            video.currentTime = maxTime;
            if (!video.paused) video.pause();
          }
        } else {
          // Locked at neutral pose until user moves mouse
          if (!video.paused) video.pause();
          if (video.currentTime !== 0) video.currentTime = 0;
        }
      }

      rafRef.current = requestAnimationFrame(updateFrame);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(updateFrame);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Mobile Autoplay Hook
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        video.autoplay = true;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    if (window.innerWidth < 1024) {
      video.autoplay = true;
      video.play().catch(() => {});
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent">
      {/* 5% Oversized Bleed Container preventing edge overflow / black block gaps during 3D transform */}
      <div
        ref={containerRef}
        className="absolute -top-[5%] -left-[5%] w-[110%] h-[110%]"
        style={{
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-right lg:object-right-bottom"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
