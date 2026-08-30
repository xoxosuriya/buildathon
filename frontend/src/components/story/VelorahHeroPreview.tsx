import React from 'react';

const VIDEO_SRC = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

export const VelorahHeroPreview: React.FC = () => {
  return (
    <div 
      className="relative w-full h-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: "hsl(201 100% 13%)" }}
    >
      
      {/* Absolute Video Loop Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-50"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 z-0 pointer-events-none" />

      {/* Nav Row */}
      <div className="relative z-10 flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 border-b border-white/5 bg-black/10 backdrop-blur-[2px]">
        {/* Left Brand */}
        <span className="font-serif-display text-white text-sm sm:text-base md:text-lg tracking-tight font-normal select-none">
          IntentLock<sup className="text-[0.5em] font-sans font-normal ml-0.5">®</sup>
        </span>
        
        {/* Center Links */}
        <div className="hidden md:flex items-center gap-4 text-[9px] lg:text-[10px] text-white/50 select-none">
          {['Intent', 'Proposal', 'Limit', 'Audit'].map((lnk) => (
            <span key={lnk} className="hover:text-white cursor-pointer transition-colors duration-200">
              {lnk}
            </span>
          ))}
        </div>

        {/* Right Button */}
        <div className="liquid-glass rounded-full px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] text-white font-mono font-medium tracking-wide uppercase select-none cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200">
          TRY LIVE DEMO
        </div>
      </div>

      {/* Hero Block overlay */}
      <div className="relative z-10 flex flex-col items-center text-center px-3 sm:px-4 pt-3 sm:pt-5 md:pt-7 pb-6 select-none max-w-lg mx-auto">
        <h1 className="font-serif-display text-white text-lg sm:text-2xl md:text-3xl lg:text-4xl font-normal leading-[1.05] tracking-[-0.03em] animate-fade-rise-cta">
          AI CAN ACT. <em className="not-italic text-white/55">IT CANNOT</em> OVERRIDE <em className="not-italic text-white/55">YOU.</em>
        </h1>
        
        <p className="animate-fade-rise-delay-cta text-white/60 text-[9px] sm:text-[10px] md:text-[11px] leading-relaxed max-w-[85%] sm:max-w-sm md:max-w-md mt-2 sm:mt-3 md:mt-4 font-sans">
          We create deterministic authorization boundaries for autonomous agents. They can search, compare, and propose, but only verified transactions execute.
        </p>

        <button className="animate-fade-rise-delay-2-cta liquid-glass rounded-full px-4 sm:px-5 md:px-6 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] font-mono tracking-widest text-white uppercase mt-3 sm:mt-4 md:mt-5 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200">
          TRY LIVE DEMO
        </button>
      </div>

    </div>
  );
};
