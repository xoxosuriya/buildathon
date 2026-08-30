import { motion } from 'framer-motion';

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

export function ProblemsSection() {
  return (
    <section
      id="problems"
      className="relative w-full bg-black text-white px-4 sm:px-6 md:px-10 py-20 sm:py-28 overflow-hidden font-sans select-none"
    >
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-20"
        >
          <p className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-neutral-400 uppercase mb-3 select-none">
            THE PROBLEM
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight mb-6 leading-tight">
            WHEN INTENT ISN'T ENOUGH
          </h2>
          <p className="text-neutral-400 text-base sm:text-lg md:text-xl font-normal max-w-2xl mx-auto leading-relaxed">
            Autonomous AI agents can turn a simple instruction into a chain of actions. The problem begins when those actions go beyond what the user actually authorized.
          </p>
        </motion.div>

        {/* Three Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">

          {/* CARD 01: PRICE ESCALATION */}
          <motion.div
            custom={0}
            variants={CARD_VARIANTS}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="relative h-[480px] sm:h-[520px] rounded-2xl bg-neutral-950 border border-neutral-800/80 p-6 sm:p-8 overflow-hidden flex flex-col justify-between group hover:border-neutral-700/80 transition-colors duration-300"
          >
            {/* Subtle Ambient Lighting */}
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-neutral-800/10 blur-3xl opacity-40 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-4">
              <span className="block text-[11px] font-sans tracking-[0.22em] text-neutral-400 font-medium uppercase">
                01 — PRICE ESCALATION
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-light text-white leading-snug mb-2">
                  The agent spends beyond your limit
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
                  A user authorizes a purchase under ₹1,500, but the agent attempts checkout for ₹1,850.
                </p>
              </div>

              {/* Minimal Monochrome Visual: Amount vs Boundary */}
              <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-xl p-4 my-1 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[11px] font-sans">
                  <span className="text-neutral-400">AUTHORIZED LIMIT: <strong className="text-white">₹1,500</strong></span>
                  <span className="text-red-500 font-semibold">+₹350 EXCEEDED</span>
                </div>

                {/* Boundary Bar */}
                <div className="relative w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  {/* Authorized fill */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '81%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-neutral-300 rounded-l-full"
                  />
                  {/* Attempted overrun segment */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '19%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.9 }}
                    className="absolute top-0 left-[81%] h-full bg-red-500/90 rounded-r-full"
                  />
                  {/* Boundary marker line */}
                  <div className="absolute top-0 left-[81%] w-[2px] h-full bg-white z-10" />
                </div>

                <div className="flex justify-between items-center text-[10px] font-sans text-neutral-400">
                  <span>Attempted Checkout: ₹1,850</span>
                  <span className="text-red-500">Boundary Wall</span>
                </div>
              </div>
            </div>

            {/* Subtle Refined Enforcement Callout */}
            <div className="relative z-10 pt-4 border-t border-neutral-800/70 mt-auto">
              <span className="block text-[11px] font-sans tracking-widest text-red-500 font-semibold uppercase mb-1">
                BLOCKED
              </span>
              <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                Maximum authorized amount exceeded.
              </p>
            </div>
          </motion.div>

          {/* CARD 02: SCOPE CREEP (Video Card) */}
          <motion.div
            custom={1}
            variants={CARD_VARIANTS}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="relative h-[480px] sm:h-[520px] rounded-2xl bg-neutral-950 border border-neutral-800/80 overflow-hidden flex flex-col group hover:border-neutral-700/80 transition-colors duration-300"
          >
            {/* Top Abstract Video Region */}
            <div className="relative w-full h-[44%] overflow-hidden bg-neutral-900">
              <video
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260421_072701_f6a01abb-eb30-4559-9d6e-774362defbc3.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover block scale-105 group-hover:scale-100 transition-transform duration-700 ease-out opacity-85"
              />
              {/* Bottom Fade Gradient into Card Background */}
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-20 bg-gradient-to-b from-transparent via-neutral-950/70 to-neutral-950" />
            </div>

            {/* Bottom Text & Progression Region */}
            <div className="relative z-10 flex-1 p-6 flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <span className="block text-[11px] font-sans tracking-[0.22em] text-neutral-400 font-medium uppercase">
                  02 — SCOPE CREEP
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-light text-white leading-tight mb-2">
                    The agent does more than you authorized
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-light mb-3">
                    A simple purchase request is delegated to another service whose actions exceed original intent.
                  </p>
                </div>

                {/* Minimal Delegation Progression */}
                <div className="flex items-center gap-1.5 text-[10px] font-sans bg-neutral-900/70 border border-neutral-800/80 rounded-lg p-2.5">
                  <span className="text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded">INTENT</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded">PURCHASE</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-red-500 border border-red-900/60 bg-red-950/40 px-2 py-0.5 rounded font-semibold">OUTSIDE SCOPE</span>
                </div>
              </div>

              {/* Subtle Refined Enforcement Callout */}
              <div className="pt-3 border-t border-neutral-800/70 mt-3">
                <span className="block text-[11px] font-sans tracking-widest text-red-500 font-semibold uppercase mb-1">
                  BLOCKED
                </span>
                <p className="text-xs text-neutral-300 font-light leading-relaxed">
                  Delegated action falls outside original authorization.
                </p>
              </div>
            </div>
          </motion.div>

          {/* CARD 03: REPLAY */}
          <motion.div
            custom={2}
            variants={CARD_VARIANTS}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="relative h-[480px] sm:h-[520px] rounded-2xl bg-neutral-950 border border-neutral-800/80 p-6 sm:p-8 overflow-hidden flex flex-col justify-between group hover:border-neutral-700/80 transition-colors duration-300"
          >
            {/* Subtle Ambient Lighting */}
            <div className="absolute top-0 left-0 h-64 w-64 rounded-full bg-neutral-800/10 blur-3xl opacity-40 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-4">
              <span className="block text-[11px] font-sans tracking-[0.22em] text-neutral-400 font-medium uppercase">
                03 — REPLAY
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-light text-white leading-snug mb-2">
                  The agent reuses an authorization
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light mb-4">
                  A single-use authorization is replayed or retried after the original action has already been completed.
                </p>
              </div>

              {/* Minimal Single-Use Token Visual */}
              <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2 font-sans text-[11px]">
                <div className="flex justify-between items-center text-neutral-400">
                  <span>AUTHORIZATION</span>
                  <span className="text-neutral-300 font-semibold">ACTION COMPLETED</span>
                </div>
                <div className="h-[1px] bg-neutral-800/80" />
                <div className="flex justify-between items-center text-neutral-400">
                  <span>REPLAY ATTEMPT</span>
                  <span className="text-red-500 font-semibold">BLOCKED</span>
                </div>
              </div>
            </div>

            {/* Subtle Refined Enforcement Callout */}
            <div className="relative z-10 pt-4 border-t border-neutral-800/70 mt-auto">
              <span className="block text-[11px] font-sans tracking-widest text-red-500 font-semibold uppercase mb-1">
                BLOCKED
              </span>
              <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                Authorization has already been consumed.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
