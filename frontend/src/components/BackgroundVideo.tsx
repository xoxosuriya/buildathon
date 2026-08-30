import { useEffect, useRef } from 'react';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4';

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Mannequin-zone cursor scrubbing hook
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      if (!video.duration || isNaN(video.duration)) return;

      // Start interactive mannequin zone right after left text area (~42% of screen width)
      const startX = window.innerWidth * 0.42;

      // Clamp max scrub time to 88% of duration to stop before the end camera zoom-in/out
      const maxScrubTime = Math.max(0, video.duration * 0.88);

      if (e.clientX <= startX) {
        // Left of text column -> Default pose (facing left towards text, t = 0)
        targetTimeRef.current = 0;
      } else {
        // Inside mannequin zone -> map progress smoothly from 0 to maxScrubTime
        const progress = Math.min(1, (e.clientX - startX) / (window.innerWidth - startX));
        targetTimeRef.current = progress * maxScrubTime;
      }
    };

    // Hardware GPU accelerated playback/scrub loop
    const updateFrame = () => {
      if (
        window.innerWidth >= 1024 &&
        video &&
        video.duration &&
        !isNaN(video.duration) &&
        video.readyState >= 2
      ) {
        const maxTime = Math.max(0, video.duration * 0.88);
        const diff = targetTimeRef.current - video.currentTime;

        if (diff > 0.05) {
          // Moving forward / turning right -> smooth hardware playback at dynamic rate
          const rate = Math.min(3.5, Math.max(1.0, diff * 3.0));
          video.playbackRate = rate;
          if (video.paused && video.currentTime < maxTime) {
            video.play().catch(() => {});
          }
        } else if (diff < -0.05) {
          // Moving backward / turning left -> step currentTime backward smoothly
          if (!video.paused) {
            video.pause();
          }
          video.currentTime = Math.max(0, video.currentTime + diff * 0.4);
        } else {
          // Reached target pose -> pause cleanly
          if (!video.paused) {
            video.pause();
          }
        }

        // Hard clamp safety to prevent reaching video end zoom
        if (video.currentTime >= maxTime) {
          video.currentTime = maxTime;
          if (!video.paused) video.pause();
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
  );
}
