import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Records Discovered",
  description = "No active trace events or capabilities match the search parameters.",
  icon
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
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        gap: 'var(--spacing-sm)',
        minHeight: '180px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
      }}
    >
      {icon && <div style={{ fontSize: '24px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{icon}</div>}
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
          maxWidth: '320px',
          margin: '0 auto'
        }}
      >
        {description}
      </p>
    </div>
  );
};
