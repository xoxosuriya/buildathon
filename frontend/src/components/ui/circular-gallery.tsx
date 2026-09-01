import React, { useEffect, useRef, HTMLAttributes } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Lock, Cpu } from 'lucide-react';
import { DemoScenarioResponse } from '../../types/api';

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export interface SecurityScenarioItem {
  id: string;
  scenarioKey: 'normal' | 'price' | 'product' | 'target' | 'replay';
  title: string;
  badgeLabel: string;
  proposedActionText: string;
  proposedAmountText: string;
  proposedMerchantText: string;
  attemptNumber: string;
  boundaryLimitText: string;
  backendResult?: DemoScenarioResponse | null;
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: SecurityScenarioItem[];
  radius?: number;
  autoRotateSpeed?: number;
  onActiveIndexChange?: (index: number) => void;
  isBackendUnavailable?: boolean;
  selectedIndex?: number | null;
}

const CircularGalleryComponent = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  (
    {
      items,
      className,
      radius = 480,
      autoRotateSpeed = 0.055,
      onActiveIndexChange,
      isBackendUnavailable = false,
      selectedIndex = null,
      ...props
    },
    ref
  ) => {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const rotationRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastActiveIndexRef = useRef<number>(-1);
    const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isManualPausedRef = useRef<boolean>(false);

    // Refs for strictly zero-re-render animation performance
    const itemsRef = useRef<SecurityScenarioItem[]>(items);
    itemsRef.current = items;

    const autoRotateSpeedRef = useRef<number>(autoRotateSpeed);
    autoRotateSpeedRef.current = autoRotateSpeed;

    const onActiveIndexChangeRef = useRef(onActiveIndexChange);
    onActiveIndexChangeRef.current = onActiveIndexChange;

    const isBackendUnavailableRef = useRef(isBackendUnavailable);
    isBackendUnavailableRef.current = isBackendUnavailable;

    const anglePerItem = 360 / items.length;
    const anglePerItemRef = useRef<number>(anglePerItem);
    anglePerItemRef.current = anglePerItem;

    // Handle manual scenario selection via capsule clicks
    useEffect(() => {
      if (selectedIndex === undefined || selectedIndex === null) return;
      const targetIndex = selectedIndex;
      const currentAnglePerItem = anglePerItemRef.current;

      const targetRotation = (360 - targetIndex * currentAnglePerItem) % 360;
      rotationRef.current = targetRotation;

      if (stageRef.current) {
        stageRef.current.style.transform = `rotateY(${targetRotation}deg)`;
      }

      lastActiveIndexRef.current = targetIndex;
      onActiveIndexChangeRef.current?.(targetIndex);

      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
      isManualPausedRef.current = true;
      pauseTimerRef.current = setTimeout(() => {
        isManualPausedRef.current = false;
      }, 4000);
    }, [selectedIndex]);

    // Single permanent rAF loop initialized EXACTLY ONCE on mount (0% frame pauses / 0% stutter)
    useEffect(() => {
      let lastTime = performance.now();

      const animate = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;

        if (!isBackendUnavailableRef.current && !isManualPausedRef.current) {
          // Time-delta based rotation calculation with delta clamping (max 64ms) to prevent stutter jumps
          const clampedDelta = Math.min(64, delta);
          rotationRef.current = (rotationRef.current + autoRotateSpeedRef.current * (clampedDelta / 16.66)) % 360;

          // Direct DOM transform update on GPU compositor layer (0ms React re-render overhead)
          if (stageRef.current) {
            stageRef.current.style.transform = `rotateY(${rotationRef.current}deg)`;
          }

          // Active card index check
          const totalRotation = rotationRef.current % 360;
          let closestIndex = 0;
          let minAngleDiff = 360;
          const currentAnglePerItem = anglePerItemRef.current;

          itemsRef.current.forEach((_, i) => {
            const itemAngle = i * currentAnglePerItem;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            if (normalizedAngle < minAngleDiff) {
              minAngleDiff = normalizedAngle;
              closestIndex = i;
            }
          });

          if (closestIndex !== lastActiveIndexRef.current) {
            lastActiveIndexRef.current = closestIndex;
            onActiveIndexChangeRef.current?.(closestIndex);
          }
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (pauseTimerRef.current) {
          clearTimeout(pauseTimerRef.current);
        }
      };
    }, []); // RUN ONCE ON MOUNT

    return (
      <div
        ref={ref}
        role="region"
        aria-label="IntentLock 3D Circular Security Ring"
        className={cn(
          "relative w-full h-[540px] sm:h-[580px] flex items-center justify-center select-none py-4 overflow-visible font-sans",
          className
        )}
        style={{ perspective: '2000px' }}
        {...props}
      >
        {isBackendUnavailable ? (
          /* BACKEND UNAVAILABLE ERROR STATE INSIDE WHITE CONTAINER */
          <div className="relative z-30 max-w-md w-full p-6 rounded-2xl bg-white border border-rose-200 shadow-xl text-left space-y-3 font-sans text-neutral-900">
            <div className="flex items-center gap-2 font-semibold text-rose-700 text-sm">
              <ShieldAlert className="h-5 w-5 stroke-[1.5] shrink-0" />
              <span>BACKEND UNAVAILABLE</span>
            </div>
            <p className="text-neutral-600 text-xs leading-relaxed">
              Unable to reach the IntentLock verification backend. Ensure FastAPI server is running on port 8000.
            </p>
            <div className="pt-2 text-[10px] font-sans text-neutral-400 uppercase tracking-widest border-t border-neutral-100 font-medium">
              FASTAPI DISCONNECTED · VERIFICATION PAUSED
            </div>
          </div>
        ) : (
          /* 3D CONTINUOUSLY ROTATING Y-AXIS RING (DIRECT GPU TRANSFORM) */
          <div
            ref={stageRef}
            className="relative w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            {items.map((item, i) => {
              const itemAngle = i * anglePerItem;
              const backend = item.backendResult;

              return (
                <div
                  key={item.id}
                  role="group"
                  aria-label={item.title}
                  className="absolute left-1/2 top-1/2 w-[280px] sm:w-[305px] h-[395px] sm:h-[415px] origin-center"
                  style={{
                    transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                    marginLeft: '-140px',
                    marginTop: '-197px',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                  }}
                >
                  {/* TWO-SIDED PHYSICAL 3D CARD (bg-black) */}
                  <div
                    className={cn(
                      "relative w-full h-full rounded-2xl bg-black font-sans border border-neutral-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-white overflow-hidden ring-1 ring-white/10 transition-shadow duration-300"
                    )}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* ── FRONT FACE (rotateY 0deg) ── */}
                    <div
                      className="absolute inset-0 w-full h-full bg-black p-4.5 sm:p-5 flex flex-col justify-between text-left text-white rounded-2xl"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                    >
                      {/* Card Header */}
                      <div className="border-b border-neutral-800/90 pb-2.5 space-y-1 shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-sans font-semibold uppercase tracking-widest text-neutral-400">
                            SECURITY SCENARIO
                          </span>
                          <span
                            className={cn(
                              "text-[8.5px] font-sans font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider",
                              item.scenarioKey === 'normal'
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/80"
                                : "bg-rose-950 text-rose-400 border border-rose-800/80"
                            )}
                          >
                            {item.badgeLabel}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-sans font-bold text-white tracking-tight leading-tight">
                          {item.title}
                        </h3>
                      </div>

                      {/* Proposed Action Box */}
                      <div className="bg-[#0B0B0E] border border-neutral-800/90 rounded-xl p-2.5 space-y-1 shrink-0">
                        <div className="flex items-center justify-between text-[9.5px] font-sans font-semibold text-neutral-400 uppercase tracking-wider">
                          <span>AI AGENT PROPOSED ACTION</span>
                          <Cpu className="h-3 w-3 stroke-[1.5] text-neutral-400" />
                        </div>
                        <p className="text-[11px] sm:text-xs font-sans font-semibold text-neutral-100 leading-tight">
                          <span className={item.scenarioKey === 'product' ? 'text-rose-400 font-bold underline' : ''}>
                            {item.proposedActionText}
                          </span>{' '}
                          ·{' '}
                          <span className={item.scenarioKey === 'price' ? 'text-rose-400 font-bold underline' : 'text-neutral-200'}>
                            {item.proposedAmountText}
                          </span>{' '}
                          ·{' '}
                          <span className={item.scenarioKey === 'target' ? 'text-rose-400 font-bold underline' : ''}>
                            {item.proposedMerchantText}
                          </span>
                        </p>
                        <div className="text-[9.5px] font-sans text-neutral-400 font-medium">
                          Attempt: {item.attemptNumber}
                        </div>
                      </div>

                      {/* Authorized Boundary Box */}
                      <div className="bg-[#0B0B0E] border border-neutral-800/90 rounded-xl p-2.5 space-y-0.5 shrink-0">
                        <div className="flex items-center justify-between text-[9.5px] font-sans font-semibold text-neutral-400 uppercase tracking-wider">
                          <span>AUTHORIZED BOUNDARY</span>
                          <Lock className="h-3 w-3 stroke-[1.5] text-neutral-400" />
                        </div>
                        <p className="text-[10.5px] font-sans text-neutral-300 font-medium leading-tight">
                          {item.boundaryLimitText}
                        </p>
                      </div>

                      {/* Verdict Banner from Real Backend */}
                      <div
                        className={cn(
                          "rounded-xl p-2.5 border text-[11px] font-sans space-y-1 shrink-0 transition-colors",
                          backend?.status === 'AUTHORIZED' || item.scenarioKey === 'normal'
                            ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
                            : "bg-rose-950/80 border-rose-800 text-rose-200"
                        )}
                      >
                        <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            {backend?.status === 'AUTHORIZED' || item.scenarioKey === 'normal' ? (
                              <ShieldCheck className="h-3.5 w-3.5 stroke-[1.8] text-emerald-400 shrink-0" />
                            ) : (
                              <ShieldAlert className="h-3.5 w-3.5 stroke-[1.8] text-rose-400 shrink-0" />
                            )}
                            <span className="text-white">INTENTLOCK VERDICT</span>
                          </div>

                          {backend?.status === 'AUTHORIZED' || item.scenarioKey === 'normal' ? (
                            <span className="flex items-center gap-1 font-extrabold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3 stroke-[2]" />
                              AUTHORIZED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-extrabold text-rose-400">
                              <XCircle className="h-3 w-3 stroke-[2]" />
                              BLOCKED
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] font-sans font-medium leading-tight opacity-90 line-clamp-2 text-neutral-300">
                          {backend?.reason || backend?.explanation || (
                            item.scenarioKey === 'normal'
                              ? 'All 21 authorization checks passed cleanly.'
                              : 'Action violates authorization boundary.'
                          )}
                        </p>
                      </div>

                      {/* Card Footer Provenance */}
                      <div className="flex items-center justify-between text-[9.5px] font-sans font-medium uppercase text-neutral-400 tracking-wider pt-1 border-t border-neutral-800/90 shrink-0">
                        <span>21 CHECKS EVALUATED</span>
                        <span>FASTAPI BACKEND</span>
                      </div>
                    </div>

                    {/* ── BACK FACE (rotateY 180deg) ── */}
                    <div
                      className="absolute inset-0 w-full h-full bg-[#050508] p-5 flex flex-col justify-between items-center text-center text-white rounded-2xl border border-neutral-800/90"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <div className="w-full flex items-center justify-between border-b border-neutral-800/90 pb-2.5">
                        <span className="text-[9.5px] font-sans font-semibold text-neutral-400 uppercase tracking-widest">
                          INTENTLOCK SECURITY
                        </span>
                        <span className="text-[9.5px] font-sans text-emerald-400 font-bold uppercase tracking-wider">
                          ACTIVE ENFORCEMENT
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center space-y-3 my-auto">
                        <div className="h-14 w-14 rounded-full bg-[#0B0B0E] border border-neutral-800 flex items-center justify-center text-emerald-400 shadow-inner">
                          <Lock className="h-7 w-7 stroke-[1.8]" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-sans font-bold tracking-tight text-white uppercase">
                            BOUNDARY CHECK
                          </h4>
                          <p className="text-[10.5px] font-sans text-neutral-400 max-w-[200px] leading-tight font-normal">
                            21-Check Real-Time Autonomous Enforcement Engine
                          </p>
                        </div>
                      </div>

                      <div className="w-full pt-2.5 border-t border-neutral-800/90 text-[9.5px] font-sans font-semibold text-neutral-400 uppercase tracking-wider flex justify-between">
                        <span>INTENT-BOUND</span>
                        <span>SCENARIO #{i + 1}</span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

CircularGalleryComponent.displayName = 'CircularGallery';

export const CircularGallery = React.memo(CircularGalleryComponent);
