import React from 'react';

export default function Card({ children, className = '', style = {}, noShadow = true, as = 'div', ...props }) {
  const Component = as;
  const base = 'bg-white rounded-xl p-4';
  const shadow = noShadow ? '' : 'shadow';

  return (
    <Component className={`${base} ${shadow} ${className}`} style={style} {...props}>
      {children}
    </Component>
  );
}
