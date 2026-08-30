import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'neutral' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'var(--color-success)',
          text: 'var(--color-success)'
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: 'var(--color-error)',
          text: 'var(--color-error)'
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'var(--color-accent)',
          text: 'var(--color-accent)'
        };
      case 'info':
        return {
          bg: 'rgba(59, 130, 246, 0.1)',
          border: 'var(--color-primary)',
          text: 'var(--color-primary)'
        };
      default:
        return {
          bg: 'rgba(156, 163, 175, 0.1)',
          border: 'var(--color-border)',
          text: 'var(--color-text-muted)'
        };
    }
  };

  const colors = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--font-size-caption)',
        fontWeight: 'var(--font-weight-medium)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text
      }}
    >
      {children}
    </span>
  );
};
