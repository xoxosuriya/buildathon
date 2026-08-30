import React from 'react';
import { Card } from '../ui/Card';

export const AgentExperience: React.FC = () => {
  const terminalLines = [
    { type: 'info', text: 'INIT: AgentShoppingBuddy v1.2 loaded into intent context.' },
    { type: 'info', text: 'QUERY: Natural Language request parsed: "Buy one wireless mouse under ₹1,500."' },
    { type: 'success', text: 'CATALOG: Discovered product SKU: MOUSE-ERG-01 at merchant TechZone. Base Price: ₹1,200.00' },
    { type: 'info', text: 'PROPOSAL: Synthesizing cryptographic proposal snapshot PROP-94A1...' },
    { type: 'warning', text: 'CREDENTIAL: Check failed: Agent holds NO wallet or credit keys. Retrying via Gateway...' },
    { type: 'info', text: 'INTENTLOCK: Submitting proposal to user dashboard. Awaiting capability contract...' },
    { type: 'success', text: 'MINTED: Capability contract auth_legit_82f discovered! Bounded limit: ₹1,200.00' },
    { type: 'info', text: 'EXECUTE: Attempting payment dispatch with auth_legit_82f on gateway...' }
  ];

  return (
    <div className="grid-two-col">
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: 'var(--font-size-subheading)',
            fontWeight: 'var(--font-weight-bold)',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-md)'
          }}
        >
          AUTONOMY WITHOUT WALLET CREDENTIALS
        </h3>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Autonomous shopping agents must not store sensitive credentials or credit card access keys. If they do, any remote code execution or context drift can result in total wallet depletion.
        </p>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Under the IntentLock protocol, the agent operates inside a zero-privilege sandbox. When it decides to purchase, it generates a proposal, waits for a user-approved capability signature, and passes it to the gateway.
        </p>
        <p>
          The agent never touches real bank APIs. The payment is executed purely on the gateway side, ensuring complete logical isolation of credentials.
        </p>
      </div>

      <div>
        <Card variant="default" padding="none">
          {/* Console Header */}
          <div
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 'var(--border-width-thin) solid var(--color-border)'
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--font-size-micro)',
                color: 'var(--color-text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Agent Execution Console
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                display: 'inline-block'
              }}
            />
          </div>

          {/* Console Body */}
          <div
            style={{
              padding: '16px',
              fontFamily: 'var(--font-family-mono)',
              fontSize: '11px',
              backgroundColor: '#05070c',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left'
            }}
          >
            {terminalLines.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', textTransform: 'none' }}>
                <span style={{ color: 'var(--color-text-disabled)' }}>&gt;</span>
                <span
                  style={{
                    color:
                      line.type === 'success'
                        ? 'var(--color-success)'
                        : line.type === 'warning'
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)'
                  }}
                >
                  {line.text}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
