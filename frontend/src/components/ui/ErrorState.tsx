import React from 'react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Evaluation Halt",
  description = "A strict security boundary violation was detected and processing terminated.",
  onRetry
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
        border: '1px solid var(--color-error)',
        borderRadius: 'var(--radius-lg)',
        gap: 'var(--spacing-md)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        minHeight: '180px'
      }}
    >
      <div style={{ color: 'var(--color-error)', fontSize: '28px', lineHeight: 1 }}>⚠</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h4
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: 'var(--font-size-body)',
            fontWeight: 'var(--font-weight-medium)',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)'
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-muted)',
            maxWidth: '420px',
            margin: '0 auto'
          }}
        >
          {description}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 'var(--font-weight-medium)',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          RETRY EVALUATION PIPELINE
        </button>
      )}
    </div>
  );
};
