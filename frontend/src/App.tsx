import { BackgroundVideo } from './components/BackgroundVideo';
import { HeroContent } from './components/HeroContent';
import { ProblemsSection } from './components/sections/ProblemsSection';
import { HowItWorksSection } from './components/sections/HowItWorksSection';
import { CapabilitiesSection } from './components/sections/CapabilitiesSection';
import { ProductWorkflowSection } from './components/sections/ProductWorkflowSection';
import { InteractiveDemoSection } from './components/sections/InteractiveDemoSection';
import { CtaSection } from './components/sections/CtaSection';
import { IntentLockFooter } from './components/sections/IntentLockFooter';
import { SiteReadinessGate } from './components/SiteReadinessGate';

export default function App() {
  const scrollToLiveDemo = () => {
    const el = document.getElementById('live-demo') || document.getElementById('workflow');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHowItWorks = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).__resetHowItWorksStep) {
        (window as any).__resetHowItWorksStep();
      }
      window.dispatchEvent(new CustomEvent('reset-how-it-works'));
    }
    const el = document.getElementById('how-it-works');
    if (el) {
      const topPos = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: topPos,
        behavior: 'smooth',
      });
    }
  };

  return (
    <SiteReadinessGate>
      <div className="relative bg-[#000000] text-white font-sans selection:bg-neutral-800 selection:text-white antialiased overflow-x-hidden">
        
        {/* ── SECTION 1: HERO (SHIFTED SLIGHTLY FURTHER DOWN BY ADDITIONAL 2-3% VIEWPORT HEIGHT FOR COMFORTABLE HEAD ROOM) ── */}
        <section id="hero" className="relative flex flex-col lg:block lg:min-h-screen pt-10 sm:pt-14 lg:pt-16">
          <BackgroundVideo />
          <HeroContent onLearnClick={scrollToHowItWorks} />
        </section>

        {/* ── SECTION 2: PROBLEMS ── */}
        <ProblemsSection />

        {/* ── SECTION 3: HOW IT WORKS ── */}
        <HowItWorksSection />

        {/* ── SECTION 4: CAPABILITIES ── */}
        <CapabilitiesSection />

        {/* ── SECTION 6: SECURITY ENFORCEMENT SHOWCASE (3D Circular Ring) ── */}
        <InteractiveDemoSection />

        {/* ── FINAL HYPERDRIVE CTA ("You've seen IntentLock enforce boundary. Now test it yourself.") ── */}
        <CtaSection onDemoClick={scrollToLiveDemo} />

        {/* ── LIVE DEMO / REAL APPLICATION WORKFLOW ── */}
        <ProductWorkflowSection />

        {/* ── FINAL MINIMALIST INTENTLOCK FOOTER (DIRECTLY AFTER LIVE DEMO, MATCHING BACKGROUND) ── */}
        <IntentLockFooter onNavigateHowItWorks={scrollToHowItWorks} />

      </div>
    </SiteReadinessGate>
  );
}
