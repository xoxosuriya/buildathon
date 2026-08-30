import React from 'react';
import { Container } from '../ui/Container';

interface SectionWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title?: string;
  subtitle?: string;
  divider?: boolean;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  id,
  title,
  subtitle,
  divider = true,
  children,
  style,
  ...props
}) => {
  return (
    <section
      id={id}
      style={{
        paddingTop: 'var(--spacing-layout)',
        paddingBottom: 'var(--spacing-layout)',
        backgroundColor: 'transparent',
        borderBottom: divider ? 'var(--border-width-thin) solid var(--color-border)' : 'none',
        ...style
      }}
      {...props}
    >
      <Container>
        {(title || subtitle) && (
          <div style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'left' }}>
            {subtitle && (
              <span
                style={{
                  fontFamily: 'var(--font-family-sans)',
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: 'var(--spacing-xs)'
                }}
              >
                {subtitle}
              </span>
            )}
            {title && (
              <h2
                style={{
                  fontFamily: 'var(--font-family-sans)',
                  fontSize: 'var(--font-size-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-primary)'
                }}
              >
                {title}
              </h2>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
};
