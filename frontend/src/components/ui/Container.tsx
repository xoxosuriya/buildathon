import React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  fluid?: boolean;
}

export const Container: React.FC<ContainerProps> = ({ children, fluid = false, style, ...props }) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: fluid ? '100%' : 'var(--container-max-width)',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 'var(--spacing-lg)',
        paddingRight: 'var(--spacing-lg)',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};
