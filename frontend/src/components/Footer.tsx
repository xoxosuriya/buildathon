import { motion } from 'framer-motion';

const FOOTER_LINKS = {
  product: [
    { label: 'Product', href: '#product' },
    { label: 'Security', href: '#problems' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Demo', href: '#demo' },
  ],
  company: [
    { label: 'About', href: '#product' },
    { label: 'Contact', href: '#demo' },
    { label: 'Documentation', href: '#capabilities' },
    { label: 'Careers', href: '#product' },
  ],
  resources: [
    { label: 'Live Demo', href: '#demo' },
    { label: 'Documentation', href: '#capabilities' },
    { label: 'Privacy', href: '#privacy' },
    { label: 'Terms', href: '#terms' },
  ],
};

export function Footer() {
  return (
    <footer className="relative w-full bg-black text-white px-4 sm:px-6 md:px-10 pt-10 pb-12 overflow-hidden font-sans select-none">
      <div className="w-full max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl bg-neutral-950/70 backdrop-blur-xl border border-white/10 p-8 sm:p-12 md:p-14 overflow-hidden shadow-2xl shadow-black/80"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 20px 40px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Subtle Glass Shimmer Accent */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

          {/* Main Footer Layout */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12 pb-10 border-b border-white/10">
            {/* Brand Column (2 cols wide) */}
            <div className="md:col-span-2 flex flex-col justify-between">
              <div>
                <a
                  href="/"
                  className="text-2xl sm:text-3xl font-medium tracking-tight text-white no-underline inline-flex items-baseline gap-1 mb-3"
                >
                  IntentLock® <span className="text-xl">✱</span>
                </a>
                <p className="text-sm text-neutral-400 font-light max-w-sm leading-relaxed">
                  Enforceable boundaries for autonomous AI agents. Ensure every transaction stays within what you actually authorized — and nothing more.
                </p>
              </div>
            </div>

            {/* Links Group 1: Product */}
            <div>
              <h4 className="text-xs font-mono tracking-widest text-neutral-400 uppercase font-semibold mb-4">
                PRODUCT
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {FOOTER_LINKS.product.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-neutral-300 hover:text-white transition-colors duration-200 no-underline font-light"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links Group 2: Company */}
            <div>
              <h4 className="text-xs font-mono tracking-widest text-neutral-400 uppercase font-semibold mb-4">
                COMPANY
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {FOOTER_LINKS.company.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-neutral-300 hover:text-white transition-colors duration-200 no-underline font-light"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links Group 3: Resources */}
            <div>
              <h4 className="text-xs font-mono tracking-widest text-neutral-400 uppercase font-semibold mb-4">
                RESOURCES
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {FOOTER_LINKS.resources.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-neutral-300 hover:text-white transition-colors duration-200 no-underline font-light"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="relative z-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-400 font-light">
            <p>© {new Date().getFullYear()} IntentLock Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#privacy" className="hover:text-white transition-colors no-underline text-neutral-400">
                Privacy Policy
              </a>
              <a href="#terms" className="hover:text-white transition-colors no-underline text-neutral-400">
                Terms of Service
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
