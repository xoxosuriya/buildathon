import React from 'react';

interface DividerProps {
  dashed?: boolean;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const Divider: React.FC<DividerProps> = ({ dashed = false, spacing = 'md' }) => {
  const getMargin = () => {
    if (spacing === 'none') return '0';
    if (spacing === 'sm') return 'var(--spacing-sm) 0';
    if (spacing === 'lg') return 'var(--spacing-xl) 0';
    return 'var(--spacing-md) 0';
  };

  return (
    <hr
      style={{
        border: 'none',
        borderTop: `${dashed ? 'dashed' : 'solid'} var(--border-width-thin) var(--color-border)`,
        margin: getMargin(),
        width: '100%'
      }}
    />
  );
};
