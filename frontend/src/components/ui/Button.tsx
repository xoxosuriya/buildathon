import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const getStyles = () => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none';
    
    // Size styles
    let sizeStyle = '';
    if (variant !== 'link') {
      if (size === 'sm') sizeStyle = 'padding: 6px 12px; font-size: var(--font-size-caption); border-radius: var(--radius-sm);';
      if (size === 'md') sizeStyle = 'padding: 10px 20px; font-size: var(--font-size-body); border-radius: var(--radius-md);';
      if (size === 'lg') sizeStyle = 'padding: 14px 28px; font-size: var(--font-size-subheading); border-radius: var(--radius-lg);';
    } else {
      sizeStyle = 'font-size: inherit; text-decoration: underline; background: transparent; border: none; padding: 0;';
    }

    // Variant styles
    let variantStyle = '';
    if (variant === 'primary') {
      variantStyle = 'background-color: var(--color-primary); color: var(--color-text-primary); border: 1px solid transparent; cursor: pointer;';
    } else if (variant === 'secondary') {
      variantStyle = 'background-color: transparent; color: var(--color-text-primary); border: var(--border-width-thin) solid var(--color-border); cursor: pointer;';
    } else if (variant === 'link') {
      variantStyle = 'color: var(--color-primary); cursor: pointer;';
    }

    // Hover styles
    let hoverStyle = '';
    if (!disabled && !loading) {
      if (variant === 'primary') hoverStyle = 'filter: brightness(1.15);';
      else if (variant === 'secondary') hoverStyle = 'border-color: var(--color-border-active); background-color: var(--color-surface);';
      else if (variant === 'link') hoverStyle = 'filter: brightness(1.2);';
    } else {
      hoverStyle = 'opacity: 0.6; cursor: not-allowed;';
    }

    return { sizeStyle, variantStyle, hoverStyle };
  };

  const { sizeStyle, variantStyle, hoverStyle } = getStyles();

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 'var(--font-weight-medium)',
        transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
        outline: 'none',
        ...Object.fromEntries(
          (sizeStyle + variantStyle + hoverStyle)
            .split(';')
            .filter(Boolean)
            .map((s) => {
              const [k, v] = s.split(':');
              return [
                k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase()),
                v.trim()
              ];
            })
        )
      }}
      className={`animate-transition ${className}`}
      {...props}
    >
      {loading && (
        <svg
          style={{ animation: 'spin 1s linear infinite', width: '1em', height: '1em' }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            style={{ opacity: 0.25 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.75 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

// Simple spin animation stylesheet injection if not loaded
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
