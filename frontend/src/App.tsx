import { Nav } from './components/Nav';
import { BackgroundVideo } from './components/BackgroundVideo';
import { HeroContent } from './components/HeroContent';
import { ProblemsSection } from './components/sections/ProblemsSection';
import { HowItWorksSection } from './components/sections/HowItWorksSection';
import { CapabilitiesSection } from './components/sections/CapabilitiesSection';

export default function App() {
  const scrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToLearn = () => {
    const el = document.getElementById('problems');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative bg-[#000000] text-white font-sans selection:bg-neutral-800 selection:text-white antialiased overflow-x-hidden">
      
      {/* ── PERSISTENT LIQUID-GLASS NAVBAR ── */}
      <Nav onDemoClick={scrollToDemo} />

      {/* ── SECTION 1: HERO (UNTOUCHED / READ-ONLY) ── */}
      <section id="hero" className="relative flex flex-col lg:block lg:min-h-screen">
        <BackgroundVideo />
        <HeroContent onDemoClick={scrollToDemo} onLearnClick={scrollToLearn} />
      </section>

      {/* ── SECTION 2: PROBLEMS (SEPARATE SIBLING SECTION BELOW HERO) ── */}
      <ProblemsSection />

      {/* ── SECTION 3: HOW IT WORKS (SEPARATE SIBLING SECTION BELOW PROBLEMS) ── */}
      <HowItWorksSection />

      {/* ── SECTION 4: CAPABILITIES (NEW STANDALONE SIBLING SECTION BELOW HOW IT WORKS) ── */}
      <CapabilitiesSection />

    </div>
  );
}
