import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Discovery & Proposal",
      desc: "The AI agent scans catalog items matching the user's intent. It generates a signed proposal snapshot including merchant, sku, base price, and inventory details."
    },
    {
      num: "02",
      title: "Capability Minting",
      desc: "The user reviews the proposal. If valid, they mint a cryptographic single-use capability contract that defines absolute spending boundaries (e.g. maximum price of ₹1,200)."
    },
    {
      num: "03",
      title: "Gateway Verification",
      desc: "When the agent attempts execution, IntentLock routes the transaction payload through a real-time, zero-trust verification engine evaluating 21 deterministic check parameters."
    },
    {
      num: "04",
      title: "Secure Settlement",
      desc: "Upon passing all verification checks, the gateway releases payment instructions to the Razorpay checkout endpoint. The capability contract is atomically marked as USED."
    }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--spacing-lg)'
      }}
    >
      {steps.map((step) => (
        <div
          key={step.num}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
            borderLeft: '2px solid var(--color-border)',
            paddingLeft: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-xs)',
            paddingBottom: 'var(--spacing-xs)'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-subheading)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              lineHeight: 1
            }}
          >
            {step.num}
          </span>
          <h4
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-semibold)',
              textTransform: 'uppercase',
              color: 'var(--color-text-primary)'
            }}
          >
            {step.title}
          </h4>
          <p
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-muted)',
              lineHeight: 'var(--line-height-caption)'
            }}
          >
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  );
};
