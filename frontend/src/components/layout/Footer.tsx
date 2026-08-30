import React from 'react';
import { Container } from '../ui/Container';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: 'var(--border-width-thin) solid var(--color-border)',
        paddingTop: 'var(--spacing-xl)',
        paddingBottom: 'var(--spacing-xl)'
      }}
    >
      <Container
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--spacing-md)'
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                textTransform: 'uppercase'
              }}
            >
              IntentLock
            </span>
            <p
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-text-muted)',
                marginTop: '4px'
              }}
            >
              Deterministic execution boundaries for autonomous AI commerce.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase'
              }}
            >
              Razorpay Productthon 2026
            </span>
          </div>
        </div>

        <div
          style={{
            borderTop: 'var(--border-width-thin) solid rgba(255, 255, 255, 0.05)',
            paddingTop: 'var(--spacing-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--spacing-sm)'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-text-disabled)',
              textTransform: 'uppercase'
            }}
          >
            © 2026 INTENTLOCK. ALL RIGHTS RESERVED.
          </span>
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-text-disabled)',
              textTransform: 'uppercase'
            }}
          >
            SYSTEM REF: IL-SEC-GATEWAY-V1
          </span>
        </div>
      </Container>
    </footer>
  );
};
