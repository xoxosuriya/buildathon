import React from 'react';
import { Shield, Mail, Instagram, Linkedin, Github } from 'lucide-react';
import { Footer } from '../ui/footer';

interface IntentLockFooterProps {
  onNavigateHowItWorks?: () => void;
}

export function IntentLockFooter({ onNavigateHowItWorks }: IntentLockFooterProps) {
  const handleHowItWorksClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      if ((window as any).__resetHowItWorksStep) {
        (window as any).__resetHowItWorksStep();
      }
      window.dispatchEvent(new CustomEvent('reset-how-it-works'));
    }
    if (onNavigateHowItWorks) {
      onNavigateHowItWorks();
    } else {
      const el = document.getElementById('how-it-works');
      if (el) {
        const topPos = el.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: topPos,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleAnchorClick = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const topPos = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: topPos,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Footer
      logo={<Shield className="h-6 w-6 text-neutral-900 stroke-[2.2]" />}
      brandName="IntentLock®"
      socialLinks={[
        {
          icon: <Mail className="h-4.5 w-4.5 stroke-[1.8]" />,
          href: "https://mail.google.com/mail/?view=cm&fs=1&to=sp2742006@gmail.com",
          label: "Gmail (Compose to sp2742006@gmail.com)",
        },
        {
          icon: <Instagram className="h-4.5 w-4.5 stroke-[1.8]" />,
          href: "https://www.instagram.com/xoxo.suriya/",
          label: "Instagram",
        },
        {
          icon: <Linkedin className="h-4.5 w-4.5 stroke-[1.8]" />,
          href: "https://www.linkedin.com/in/suriya-prakash-28a5273ba/",
          label: "LinkedIn",
        },
        {
          icon: <Github className="h-4.5 w-4.5 stroke-[1.8]" />,
          href: "https://github.com/xoxosuriya",
          label: "GitHub",
        },
      ]}
      mainLinks={[
        { href: "#hero", label: "Home", onClick: handleAnchorClick('hero') },
        { href: "#how-it-works", label: "How It Works", onClick: handleHowItWorksClick },
        { href: "#capabilities", label: "Capabilities", onClick: handleAnchorClick('capabilities') },
        { href: "#demo", label: "Security Scenarios", onClick: handleAnchorClick('demo') },
        { href: "#live-demo", label: "Live Demo", onClick: handleAnchorClick('live-demo') },
      ]}
      copyright={{
        text: "© 2026 IntentLock",
        license: "All rights reserved.",
      }}
    />
  );
}
