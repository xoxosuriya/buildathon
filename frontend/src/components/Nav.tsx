import { useState } from 'react';

interface NavProps {
  onDemoClick?: () => void;
}

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Security', href: '#problems' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Demo', href: '#demo' },
];

export function Nav({ onDemoClick }: NavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Persistent Liquid-Glass Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 px-5 sm:px-8 py-3.5 sm:py-4 flex flex-row justify-between items-center liquid-glass text-white">
        {/* Logo (Left Side) */}
        <div className="flex flex-row items-center gap-3">
          <a
            href="/"
            className="text-[21px] sm:text-[26px] tracking-tight font-medium select-none no-underline flex items-baseline gap-0.5 text-white"
          >
            IntentLock®
          </a>
          <span className="text-[25px] sm:text-[30px] select-none tracking-[-0.02em] font-medium leading-none mb-1 text-white">
            ✱
          </span>
        </div>

        {/* Desktop Nav Links (Center) */}
        <nav className="hidden md:flex flex-row items-center text-[23px] font-normal text-white">
          {NAV_LINKS.map((link, index) => (
            <span key={link.label} className="flex items-center">
              <a
                href={link.href}
                className="hover:opacity-60 transition-opacity no-underline text-white"
              >
                {link.label}
              </a>
              {index < NAV_LINKS.length - 1 && (
                <span className="opacity-40 font-normal">,&nbsp;</span>
              )}
            </span>
          ))}
        </nav>

        {/* Desktop CTA (Right) */}
        <div className="hidden md:block">
          <button
            onClick={onDemoClick}
            className="text-[23px] text-white underline underline-offset-2 hover:opacity-60 transition-opacity bg-transparent border-none cursor-pointer p-0 font-normal"
          >
            Try Live Demo
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 focus:outline-none z-20 cursor-pointer bg-transparent border-none p-0"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label="Toggle Menu"
        >
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* Fullscreen Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-neutral-950/95 backdrop-blur-md transition-opacity duration-300 flex flex-col justify-center items-center gap-8 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col items-center gap-6 text-2xl text-white">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:opacity-60 transition-opacity no-underline text-white"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onDemoClick?.();
            }}
            className="text-white underline underline-offset-2 hover:opacity-60 transition-opacity text-2xl bg-transparent border-none cursor-pointer mt-4"
          >
            Try Live Demo
          </button>
        </nav>
      </div>
    </>
  );
}
