import React from 'react';
import { Card } from '../ui/Card';

export const ProductCapabilities: React.FC = () => {
  const capabilities = [
    {
      title: "Single-Use Lifecycle",
      sub: "ONCE AND EXPIRED",
      desc: "Unlike API keys or pre-funded credit lines, IntentLock capabilities exist for exactly one transaction. Upon execution success, the capability state is updated atomically to USED, preventing replay."
    },
    {
      title: "Non-Delegable Scope",
      sub: "STRICT BINDING",
      desc: "Every capability contract is bound to a specific executing Agent ID. If the primary agent delegates, shares, or leaks the contract token to another sub-agent, the gateway flags Check 05 and halts execution."
    },
    {
      title: "Non-Subdividable Value",
      sub: "ATOMIC EXECUTION",
      desc: "A capability contract cannot be split into smaller micro-payments. An authorized amount of ₹1,200 is valid only for a single order of exactly ₹1,200. Any partial transaction attempts are blocked."
    }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--spacing-lg)'
      }}
    >
      {capabilities.map((cap) => (
        <Card key={cap.title} variant="default" padding="lg">
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-primary)',
              fontWeight: 'var(--font-weight-semibold)',
              letterSpacing: '0.1em',
              display: 'block',
              marginBottom: 'var(--spacing-sm)'
            }}
          >
            {cap.sub}
          </span>
          <h4
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-subheading)',
              fontWeight: 'var(--font-weight-bold)',
              textTransform: 'uppercase',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}
          >
            {cap.title}
          </h4>
          <p
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-body)',
              color: 'var(--color-text-muted)',
              lineHeight: 'var(--line-height-body)'
            }}
          >
            {cap.desc}
          </p>
        </Card>
      ))}
    </div>
  );
};
