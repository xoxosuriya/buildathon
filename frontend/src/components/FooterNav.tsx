import React from 'react';

export const FooterNav: React.FC = () => {
  return (
    <footer className="w-full bg-[#05070c] border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Left column */}
        <div className="text-center md:text-left">
          <span className="font-serif-display text-white text-lg block">
            IntentLock
          </span>
          <span className="text-[9px] text-slate-500 font-mono tracking-wider block mt-1 uppercase select-none">
            Deterministic Boundaries for AI Commerce
          </span>
        </div>

        {/* Right column */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 font-mono text-[9px] text-slate-600">
          <span className="uppercase">© 2026 INTENTLOCK. ALL RIGHTS RESERVED.</span>
          <span className="hidden md:inline text-slate-800">|</span>
          <span className="uppercase">REF: IL-SEC-GATEWAY-V1</span>
        </div>

      </div>
    </footer>
  );
};
