import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'dashed';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  ...props
}) => {
  const getStyles = () => {
    let bg = 'var(--color-surface)';
    let border = `1px solid var(--color-border)`;

    if (variant === 'elevated') {
      bg = 'var(--color-surface-elevated)';
      border = `1px solid var(--color-border-active)`;
    } else if (variant === 'dashed') {
      bg = 'transparent';
      border = `1px dashed var(--color-border)`;
    }

    let p = 'var(--card-padding)';
    if (padding === 'none') p = '0';
    if (padding === 'sm') p = 'var(--spacing-sm)';
    if (padding === 'lg') p = 'var(--spacing-xl)';

    return { bg, border, p };
  };

  const { bg, border, p } = getStyles();

  return (
    <div
      style={{
        backgroundColor: bg,
        border: border,
        borderRadius: 'var(--radius-lg)',
        padding: p,
        overflow: 'hidden',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};
