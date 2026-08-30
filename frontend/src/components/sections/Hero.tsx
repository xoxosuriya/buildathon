import React from 'react';
import { Button } from '../ui/Button';

interface HeroProps {
  onExplore: () => void;
  onLaunchSimulator: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onLaunchSimulator }) => {
  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px', // Below fixed nav
        position: 'relative'
      }}
    >
      <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left' }}>
        <span
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'block',
            marginBottom: 'var(--spacing-md)'
          }}
        >
          INTENTLOCK / CAPABILITY BOUNDARY FOR AI COMMERCE
        </span>

        <h1
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: 'var(--font-size-display)',
            fontWeight: 'var(--font-weight-bold)',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--line-height-display)',
            marginBottom: 'var(--spacing-lg)'
          }}
        >
          AI AGENTS CAN PROPOSE.<br />
          THEY CANNOT SPEND<br />
          WITHOUT YOUR AUTHORITY.
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: 'var(--font-size-subheading)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--line-height-body)',
            marginBottom: 'var(--spacing-xl)',
            maxWidth: '680px'
          }}
        >
          IntentLock replaces blind trust in autonomous AI agents with strict, cryptographically bound capability contracts. Empower your agents to search, discover, and negotiate—while you retain absolute control over payment execution.
        </p>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <Button onClick={onExplore} variant="primary" size="lg">
            EXPLORE SECURITY PROTOCOL
          </Button>
          <Button onClick={onLaunchSimulator} variant="secondary" size="lg">
            LAUNCH SYSTEM SIMULATOR
          </Button>
        </div>

        {/* Footnote attribution */}
        <div style={{ marginTop: 'var(--spacing-xxl)' }}>
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-text-disabled)',
              textTransform: 'uppercase'
            }}
          >
            * BOUNDED AUTONOMY • VERIFICATION ENGINE V1.0 • MULTI-SCENARIO PROVEN
          </span>
        </div>
      </div>
    </div>
  );
};
