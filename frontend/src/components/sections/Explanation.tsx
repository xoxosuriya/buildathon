import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const Explanation: React.FC = () => {
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
          THE PROBLEM OF UNBOUNDED AGENTS
        </h3>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Autonomous AI agents are capable of executing complex workflows—discovering catalog products, comparing offers, and negotiating pricing. However, giving an AI direct access to credit cards, API keys, or pre-funded wallets introduces catastrophic security vectors.
        </p>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          If an agent is compromised or encounters faulty logic, it can fall victim to price inflation attacks, execution replay attacks, or unauthorized delegation (where it shares payment details with unverified sub-agents).
        </p>
        <p>
          <strong>IntentLock solves this.</strong> Instead of pre-funding the agent, the user inspects the agent's proposal and mints a single-use, non-delegable authorization capability contract. The agent can only execute that specific transaction.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {/* Unbounded approach */}
        <Card variant="dashed" padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-caption)', textTransform: 'uppercase' }}>
              UNBOUNDED AGENT APPROACH
            </span>
            <Badge variant="error">HIGH RISK</Badge>
          </div>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-muted)', lineHeight: 'var(--line-height-caption)' }}>
            AI has direct wallet access. Vulnerable to prompt injection, price drift, and sub-agent credential sharing. Any error results in immediate financial loss.
          </p>
        </Card>

        {/* Bounded approach */}
        <Card variant="elevated" padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-caption)', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
              INTENTLOCK BOUNDARY
            </span>
            <Badge variant="success">SECURE</Badge>
          </div>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)', lineHeight: 'var(--line-height-caption)' }}>
            AI holds zero credentials. It only receives a cryptographic capability bounded to one product, one price, one merchant, and one execution. The gateway halts any deviation.
          </p>
        </Card>
      </div>
    </div>
  );
};
