import React from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({ text, className = '' }) => {
  return (
    <span className={`relative block overflow-hidden h-[1.3em] leading-none ${className}`}>
      {/* Primary line of text */}
      <span className="block transition-transform duration-300 ease-out group-hover:-translate-y-full">
        {text}
      </span>
      {/* Duplicate line of text coming from below */}
      <span className="absolute left-0 top-0 block transition-transform duration-300 ease-out translate-y-full group-hover:translate-y-0 text-accent">
        {text}
      </span>
    </span>
  );
};
