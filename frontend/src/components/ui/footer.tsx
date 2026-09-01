import React from 'react';

interface FooterProps {
  logo: React.ReactNode;
  brandName: string;
  socialLinks: Array<{
    icon: React.ReactNode;
    href: string;
    label: string;
    isMailto?: boolean;
  }>;
  mainLinks: Array<{
    href: string;
    label: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }>;
  copyright: {
    text: string;
    license?: string;
  };
}

export function Footer({
  logo,
  brandName,
  socialLinks,
  mainLinks,
  copyright,
}: FooterProps) {
  return (
    <footer className="w-full bg-[#F7F7F9] text-neutral-900 font-sans pt-16 pb-8 lg:pt-24 lg:pb-12 transition-colors selection:bg-neutral-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        
        {/* Top Row: Brand Logo + Social Icons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <a
            href="#hero"
            className="inline-flex items-center gap-x-2.5 text-neutral-900 select-none transition-opacity hover:opacity-80"
            aria-label={brandName}
          >
            {logo}
            <span className="font-bold text-xl sm:text-2xl tracking-tight text-neutral-900 font-sans">
              {brandName}
            </span>
          </a>

          <ul className="flex items-center list-none space-x-3 m-0 p-0">
            {socialLinks.map((link, i) => (
              <li key={i}>
                <a
                  href={link.href}
                  target={link.isMailto ? undefined : "_blank"}
                  rel={link.isMailto ? undefined : "noreferrer"}
                  aria-label={link.label}
                  className="h-10 w-10 rounded-full bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700 hover:text-neutral-900 border border-neutral-300/60 shadow-sm transition-all duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                >
                  {link.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Thin Internal Divider + Grid Content */}
        <div className="border-t border-neutral-300/70 mt-8 pt-8 md:mt-10 md:pt-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Copyright Information */}
          <div className="text-xs sm:text-sm font-sans leading-relaxed text-neutral-600">
            <div className="font-medium text-neutral-800">{copyright.text}</div>
            {copyright.license && (
              <div className="text-neutral-500 font-normal mt-0.5">{copyright.license}</div>
            )}
          </div>

          {/* Main Navigation Links */}
          <nav>
            <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end p-0">
              {mainLinks.map((link, i) => (
                <li key={i} className="my-1 mx-3 shrink-0">
                  <a
                    href={link.href}
                    onClick={link.onClick}
                    className="text-sm font-sans font-semibold text-neutral-900 underline-offset-4 hover:underline transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

        </div>

      </div>
    </footer>
  );
}
