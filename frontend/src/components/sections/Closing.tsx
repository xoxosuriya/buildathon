import React from 'react';
import { Button } from '../ui/Button';

interface ClosingProps {
  onAction: () => void;
}

export const Closing: React.FC<ClosingProps> = ({ onAction }) => {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', alignItems: 'center' }}>
      <h3
        style={{
          fontFamily: 'var(--font-family-sans)',
          fontSize: 'var(--font-size-heading)',
          fontWeight: 'var(--font-weight-bold)',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)'
        }}
      >
        SECURE AUTONOMOUS COMMERCE BEGINS WITH CONTROL
      </h3>
      <p style={{ fontSize: 'var(--font-size-subheading)', color: 'var(--color-text-muted)', lineHeight: 'var(--line-height-body)' }}>
        IntentLock bridges the gap between AI independence and financial safety. By converting unbounded spending rights into strict, single-use capability contracts, you allow your agents to work for you safely.
      </p>
      <div style={{ display: 'flex', gap: '16px', marginTop: 'var(--spacing-md)' }}>
        <Button onClick={onAction} variant="primary" size="md">
          GO TO SYSTEM SIMULATOR
        </Button>
      </div>
    </div>
  );
};
