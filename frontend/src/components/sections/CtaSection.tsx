import HyperdriveHero from '../ui/hyperdrive-hero';

interface CtaSectionProps {
  onDemoClick?: () => void;
}

export function CtaSection({ onDemoClick }: CtaSectionProps) {
  return (
    <div id="cta">
      <HyperdriveHero
        onCtaClick={onDemoClick}
        badgeText="INTENT-BOUND AUTHORIZATION"
        headlineText={"You've seen IntentLock enforce the boundary.\nNow test it yourself."}
        supportingText="Take full control in the live interactive sandbox. Define custom intents, mint enforceable authorizations, and test autonomous agent transactions against the real 21-check engine."
        buttonText="Try Live Demo"
      />
    </div>
  );
}
