import React from 'react';

export default function FormField({ label, required = false, children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text mb-2">
          {label} {required ? '*' : ''}
        </label>
      )}
      {children}
    </div>
  );
}
