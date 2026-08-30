import React from 'react';

interface MIconProps {
  name: string;
  size?: number;
  fill?: boolean;
  weight?: number;
  grade?: number;
  opticalSize?: number;
  className?: string;
}

export const MIcon: React.FC<MIconProps> = ({
  name,
  size = 24,
  fill = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  className = ''
}) => {
  return (
    <span
      className={`material-symbols-outlined select-none inline-block align-middle leading-none ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`
      }}
    >
      {name}
    </span>
  );
};
