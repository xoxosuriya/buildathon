import React from 'react';
import { Container } from '../ui/Container';

interface HeaderProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeSection, onNavigate }) => {
  const navItems = [
    { id: 'hero', label: 'Overview' },
    { id: 'how-it-works', label: 'Pipeline' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'simulator', label: 'Simulator' }
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 'var(--z-index-sticky)',
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: 'var(--border-width-thin) solid var(--color-border)'
      }}
    >
      <Container
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '64px'
        }}
      >
        {/* Wordmark */}
        <button
          onClick={() => onNavigate('hero')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            IntentLock
          </span>
          <span
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-accent)',
              fontWeight: 'var(--font-weight-semibold)',
              textTransform: 'uppercase'
            }}
          >
            CAPABILITY SECURITY
          </span>
        </button>

        {/* Navigation list */}
        <nav style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-medium)',
                textTransform: 'uppercase',
                color: activeSection === item.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: `2px solid ${activeSection === item.id ? 'var(--color-primary)' : 'transparent'}`,
                paddingBottom: '20px',
                marginTop: '18px',
                transition: 'color var(--motion-duration-fast) var(--motion-easing-default)'
              }}
              className="animate-transition"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </Container>
    </header>
  );
};
