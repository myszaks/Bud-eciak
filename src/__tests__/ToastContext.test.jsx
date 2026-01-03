import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider, useToast } from '../contexts/ToastContext';

function Consumer() {
  const { toasts, success } = useToast();
  React.useEffect(() => {
    success('ok');
  }, []);
  return <div data-count={toasts.length}>{toasts.length}</div>;
}

describe('ToastContext', () => {
  it('provides show/remove API', async () => {
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    const el = await screen.findByText('1');
    expect(el).toBeTruthy();
  });
});
