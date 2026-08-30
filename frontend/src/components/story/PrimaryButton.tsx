import React from 'react';
import { AnimatedText } from '../AnimatedText';

interface PrimaryButtonProps {
  children: string;
  as?: 'a' | 'button';
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  as = 'a',
  href,
  onClick,
  className = '',
  size = 'lg'
}) => {
  const sizeClasses = {
    sm: 'h-8 px-4 text-xs',
    md: 'h-10 px-6 text-xs sm:text-sm',
    lg: 'h-12 px-9 text-sm font-medium'
  };

  const baseClass = `inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-black leading-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${sizeClasses[size]} ${className}`;

  if (as === 'button') {
    return (
      <button onClick={onClick} className={baseClass}>
        <AnimatedText text={children} className="text-black" />
      </button>
    );
  }

  return (
    <a href={href} onClick={onClick} className={baseClass}>
      <AnimatedText text={children} className="text-black" />
    </a>
  );
};
