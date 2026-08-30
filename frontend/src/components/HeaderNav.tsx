import React, { useState, useEffect } from 'react';
import { AnimatedText } from './AnimatedText';

interface HeaderNavProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ activeSection, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const links = [
    { id: 'hero', label: 'INTRO' },
    { id: 'how-it-works', label: 'HOW IT WORKS' },
    { id: 'security', label: 'SECURITY' },
    { id: 'simulator', label: 'DEMO' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out border-b ${
        isScrolled 
          ? 'bg-[#07090e]/85 backdrop-blur-md border-white/5 py-4' 
          : 'bg-transparent border-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-8">
        
        {/* Wordmark Branding */}
        <button
          onClick={() => onNavigate('hero')}
          className="flex flex-col text-left border-none bg-transparent cursor-pointer group focus:outline-none focus-visible:outline-none"
        >
          <span className="font-serif-display text-white text-2xl tracking-wide leading-none transition-colors duration-300 group-hover:text-accent">
            IntentLock
          </span>
          <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase mt-1 leading-none select-none">
            CAPABILITY-BASED TRANSACTION SECURITY
          </span>
        </button>

        {/* Minimal Navigation links */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`relative py-1 border-none bg-transparent cursor-pointer group focus:outline-none focus-visible:outline-none font-mono`}
            >
              <AnimatedText 
                text={link.label} 
                className={`font-sans text-[10px] font-semibold tracking-widest transition-colors duration-300 ${
                  activeSection === link.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`} 
              />
              
              {/* Active Section Underline Indicator */}
              {activeSection === link.id && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-accent" />
              )}
            </button>
          ))}
        </nav>

        {/* Try Live Demo CTA */}
        <div>
          <button
            onClick={() => onNavigate('simulator')}
            className="liquid-glass rounded-full px-6 py-2.5 text-[10px] font-semibold tracking-widest text-white uppercase transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <AnimatedText text="TRY LIVE DEMO" />
          </button>
        </div>

      </div>
    </header>
  );
};
