import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MOCK_VERIFICATION_CHECKS } from '../../data/mockData';

export const TrustVerification: React.FC = () => {
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
          THE 21-CHECK SECURITY GATE
        </h3>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          To guarantee absolute execution safety, the IntentLock gateway evaluates 21 distinct checks in real-time. A transaction is only authorized (ALLOW) if all 21 parameters compile successfully.
        </p>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          If any check fails due to price deviation, unapproved executors, or spent capabilities, the engine immediately terminates the request (BLOCK) or requests manual verification (REVIEW).
        </p>
        <p>
          This server-side boundary ensures that even if the AI's local client is compromised, the transaction remains completely constrained.
        </p>
        <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Badge variant="success">SERVER-SIDE</Badge>
          <Badge variant="info">DETERMINISTIC</Badge>
          <Badge variant="neutral">ZERO-TRUST</Badge>
        </div>
      </div>

      <div>
        <Card variant="dashed" padding="none">
          <div
            style={{
              padding: '12px 16px',
              borderBottom: 'var(--border-width-thin) solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase'
              }}
            >
              Verification Checklist Schema
            </span>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-muted)' }}>
              21 / 21 Passed
            </span>
          </div>

          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '8px'
            }}
          >
            {MOCK_VERIFICATION_CHECKS.map((check, i) => (
              <div
                key={check.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: i < MOCK_VERIFICATION_CHECKS.length - 1 ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: 'var(--font-size-micro)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    {check.code}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-family-sans)',
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {check.name}
                  </span>
                </div>
                <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-caption)' }}>✓</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
