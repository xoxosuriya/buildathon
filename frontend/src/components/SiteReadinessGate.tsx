import { useEffect, useState } from 'react';
import { AiLoader } from './ui/ai-loader';
import { apiService } from '../services/api';

interface SiteReadinessGateProps {
  children: React.ReactNode;
}

// ── Complete Comprehensive Asset Catalog for the Entire Site ──
const CRITICAL_VIDEO_URLS = [
  // Hero Background Video / Mannequin asset
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4',
  // Problems Section Video
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260421_072701_f6a01abb-eb30-4559-9d6e-774362defbc3.mp4',
  // How IntentLock Works Videos
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_171347_f640c30d-ec21-426a-98bc-77e07c2c60cb.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4',
  // Capabilities Section Videos
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_154543_d5b83fc1-9cea-44f3-b5e8-8f325935211a.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_153148_d7a3e1dd-e5d0-4ce6-8306-00d7522ecc44.mp4',
];

const CRITICAL_IMAGE_URLS = [
  'https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1780586778/cta-bg_mlwy5s.png',
];

const SECURITY_SCENARIO_KEYS = ['normal', 'price', 'product', 'target', 'replay'] as const;

export function SiteReadinessGate({ children }: SiteReadinessGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    // Cleanly remove initial static HTML loader shell once React mounts
    const staticShell = document.getElementById('initial-static-loader');
    if (staticShell && staticShell.parentNode) {
      staticShell.parentNode.removeChild(staticShell);
    }

    // Lock page scrolling during initial loader display
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Deferred preloading function yielding main thread to browser compositor first
    const schedulePreloadingTasks = () => {
      // 1. Font Readiness Task
      const fontReadyPromise = (async () => {
        if (document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch {
            // Ignore font errors
          }
        }
      })();

      // 2. Video Media Readiness Task (Metadata / Non-blocking)
      const videoPreloadPromises = CRITICAL_VIDEO_URLS.map((url) => {
        return new Promise<void>((resolve) => {
          const vid = document.createElement('video');
          vid.preload = 'metadata';
          vid.muted = true;
          vid.playsInline = true;

          const finish = () => {
            cleanup();
            resolve();
          };

          const cleanup = () => {
            vid.removeEventListener('canplay', finish);
            vid.removeEventListener('loadedmetadata', finish);
            vid.removeEventListener('error', finish);
          };

          vid.addEventListener('canplay', finish, { once: true });
          vid.addEventListener('loadedmetadata', finish, { once: true });
          vid.addEventListener('error', finish, { once: true });

          vid.src = url;

          if (vid.readyState >= 1) {
            finish();
          }
        });
      });

      // 3. Image Assets Readiness Task
      const imagePreloadPromises = CRITICAL_IMAGE_URLS.map((url) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
          if (img.complete) resolve();
        });
      });

      // 4. FastAPI Backend Scenarios Pre-evaluation Task (Section 6 3D Circular Ring)
      const backendScenariosPromise = Promise.all(
        SECURITY_SCENARIO_KEYS.map(async (key) => {
          try {
            await apiService.evaluateDemoScenario('buy', key);
          } catch {
            // Non-critical backend fallback
          }
        })
      );

      // 5. Maximum Safety Fallback Timeout (6s)
      const safetyFallbackTimeoutPromise = new Promise<void>((resolve) => {
        setTimeout(resolve, 6000);
      });

      // Race readiness tasks against safety fallback
      Promise.race([
        Promise.all([
          fontReadyPromise,
          ...videoPreloadPromises,
          ...imagePreloadPromises,
          backendScenariosPromise,
        ]),
        safetyFallbackTimeoutPromise,
      ]).then(() => {
        if (isCancelled) return;

        // Smooth exit transition
        setIsExiting(true);
        setTimeout(() => {
          if (!isCancelled) {
            setIsReady(true);
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
          }
        }, 500);
      });
    };

    // Yield to browser compositor thread first (200ms delay) so loader animation starts immediately at 60 FPS
    const timerId = setTimeout(schedulePreloadingTasks, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* ── 21st.dev AI LOADER GLOBAL TOPMOST OVERLAY ── */}
      {!isReady && (
        <div
          className={`fixed inset-0 z-[99999] transition-opacity duration-500 ease-out ${
            isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <AiLoader size={180} text="INTENTLOCK" />
        </div>
      )}

      {/* ── ENTIRE WEBSITE CONTAINER (HIDDEN UNTIL READINESS IS CONFIRMED) ── */}
      <div
        className={`w-full transition-opacity duration-500 ease-out ${
          !isReady ? 'invisible opacity-0' : 'visible opacity-100'
        }`}
      >
        {children}
      </div>
    </>
  );
}
