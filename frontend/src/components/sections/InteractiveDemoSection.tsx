import { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { CircularGallery, SecurityScenarioItem } from '../ui/circular-gallery';
import { apiService } from '../../services/api';
import { DemoScenarioResponse } from '../../types/api';

const SCENARIO_DEFS: Array<Omit<SecurityScenarioItem, 'backendResult'>> = [
  {
    id: 'scen-1',
    scenarioKey: 'normal',
    title: 'AUTHORIZED ACTION',
    badgeLabel: 'WITHIN BOUNDARY',
    proposedActionText: 'Wireless Ergonomic Mouse',
    proposedAmountText: '₹1,200',
    proposedMerchantText: 'Authorized TechZone Merchant',
    attemptNumber: '#1',
    boundaryLimitText: 'Maximum Limit: ₹1,500 · Authorized Merchant',
  },
  {
    id: 'scen-2',
    scenarioKey: 'price',
    title: 'PRICE ESCALATION',
    badgeLabel: 'PRICE VIOLATION',
    proposedActionText: 'Wireless Ergonomic Mouse',
    proposedAmountText: '₹1,850',
    proposedMerchantText: 'Authorized TechZone Merchant',
    attemptNumber: '#1',
    boundaryLimitText: 'Maximum Limit: ₹1,500 (Escalated by ₹350)',
  },
  {
    id: 'scen-3',
    scenarioKey: 'product',
    title: 'UNAPPROVED PRODUCT',
    badgeLabel: 'SKU MISMATCH',
    proposedActionText: 'Unapproved Product SKU',
    proposedAmountText: '₹1,200',
    proposedMerchantText: 'Authorized TechZone Merchant',
    attemptNumber: '#1',
    boundaryLimitText: 'Approved SKU: PROD-MOUSE-01',
  },
  {
    id: 'scen-4',
    scenarioKey: 'target',
    title: 'UNAUTHORIZED MERCHANT',
    badgeLabel: 'VENDOR MISMATCH',
    proposedActionText: 'Wireless Ergonomic Mouse',
    proposedAmountText: '₹1,200',
    proposedMerchantText: 'Unverified Marketplace Vendor',
    attemptNumber: '#1',
    boundaryLimitText: 'Approved Vendor: MERCH-TECHZONE-01',
  },
  {
    id: 'scen-5',
    scenarioKey: 'replay',
    title: 'REPLAY ATTACK',
    badgeLabel: 'RE-REUSE ATTEMPT',
    proposedActionText: 'Wireless Ergonomic Mouse',
    proposedAmountText: '₹1,200',
    proposedMerchantText: 'Authorized TechZone Merchant',
    attemptNumber: '#2',
    boundaryLimitText: 'Scope: Single-use authorization contract',
  },
];

// Optimized Memoized Sub-Caption Component (Zero layout measurement overhead on index update)
const ActiveScenarioCaption = memo(function ActiveScenarioCaption({
  activeItem,
  activeIndex,
}: {
  activeItem: SecurityScenarioItem;
  activeIndex: number;
}) {
  return (
    <div className="mt-4 inline-flex items-center gap-3 px-4.5 py-2 rounded-full bg-white border border-neutral-300 shadow-md text-xs font-sans text-neutral-600 transition-all duration-200">
      <span className="font-sans text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
        SCENARIO {activeIndex + 1} OF 5
      </span>
      <span className="h-3 w-[1px] bg-neutral-200" />
      <span className="font-semibold text-neutral-900">
        {activeItem.title}
      </span>
      <span className="h-3 w-[1px] bg-neutral-200" />
      <span
        className={
          activeItem.backendResult?.status === 'AUTHORIZED' || activeItem.scenarioKey === 'normal'
            ? 'text-emerald-700 font-bold'
            : 'text-rose-700 font-bold'
        }
      >
        {activeItem.backendResult?.status || (activeItem.scenarioKey === 'normal' ? 'AUTHORIZED' : 'BLOCKED')}
      </span>
    </div>
  );
});

export function InteractiveDemoSection() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [scenarioData, setScenarioData] = useState<SecurityScenarioItem[]>(SCENARIO_DEFS);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState<boolean>(false);

  const handleActiveIndexChange = useCallback((index: number) => {
    setActiveIndex((prev) => (prev !== index ? index : prev));
  }, []);

  // Fetch real FastAPI backend evaluation results for all 5 security scenarios
  useEffect(() => {
    let isMounted = true;
    setIsBackendUnavailable(false);

    const fetchBackendEvaluations = async () => {
      try {
        const results = await Promise.all(
          SCENARIO_DEFS.map(async (def) => {
            try {
              const backendRes: DemoScenarioResponse = await apiService.evaluateDemoScenario('buy', def.scenarioKey);
              return { ...def, backendResult: backendRes };
            } catch {
              return { ...def, backendResult: null };
            }
          })
        );

        if (!isMounted) return;

        const hasValidBackend = results.some((r) => r.backendResult !== null);
        if (!hasValidBackend) {
          setIsBackendUnavailable(true);
        } else {
          setScenarioData(results);
        }
      } catch {
        if (isMounted) setIsBackendUnavailable(true);
      }
    };

    fetchBackendEvaluations();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeItem = scenarioData[activeIndex] || scenarioData[0];

  return (
    <section
      id="demo"
      className="relative w-full bg-[#F7F7F9] text-neutral-900 font-sans antialiased px-4 sm:px-6 md:px-10 lg:px-14 pt-24 sm:pt-28 pb-12 sm:pb-16 selection:bg-neutral-200"
    >
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
        
        {/* ── SECTION HEADER ── */}
        <p className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-neutral-500 uppercase mb-3 font-sans">
          SECURITY ENFORCEMENT
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[48px] leading-[1.12] font-light tracking-tight text-neutral-900 mb-4 font-sans max-w-3xl"
        >
          Watch IntentLock enforce the boundary.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base sm:text-lg text-neutral-600 font-normal mb-6 max-w-2xl font-sans"
        >
          An autonomous agent keeps proposing actions. Your authorization does not change.
        </motion.p>

        {/* ── 5 SCENARIO NAVIGATION BUBBLES ── */}
        {!isBackendUnavailable && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="flex flex-wrap justify-center items-center gap-2 sm:gap-2.5 mb-6 max-w-4xl"
          >
            {SCENARIO_DEFS.map((scen, idx) => (
              <div
                key={scen.id}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-sans font-semibold tracking-wider transition-all duration-300 flex items-center gap-1.5 uppercase ${
                  activeIndex === idx
                    ? 'bg-neutral-900 text-white shadow-md border border-neutral-900 scale-105'
                    : 'bg-white text-neutral-600 border border-neutral-300 hover:border-neutral-400 hover:text-neutral-900 shadow-sm'
                }`}
              >
                <span>{scen.title}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── 3D CIRCULAR GALLERY WITH UNINTERRUPTED CONTINUOUS ROTATION ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full relative overflow-visible"
        >
          <CircularGallery
            items={scenarioData}
            radius={480}
            autoRotateSpeed={0.055}
            onActiveIndexChange={handleActiveIndexChange}
            isBackendUnavailable={isBackendUnavailable}
          />
        </motion.div>

        {/* ── ACTIVE SCENARIO SUB-CAPTION ── */}
        {!isBackendUnavailable && activeItem && (
          <ActiveScenarioCaption activeItem={activeItem} activeIndex={activeIndex} />
        )}

      </div>
    </section>
  );
}
