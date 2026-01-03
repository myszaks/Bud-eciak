import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Mock supabase client to avoid real network calls
vi.mock('../lib/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ gte: () => ({ lte: () => ({ order: () => ({ limit: () => ({}) }) }) }) }) }) }) } }));

import Expenses from '../components/Expenses';
import { ToastProvider } from '../contexts/ToastContext';
import { ModalProvider } from '../contexts/ModalContext';

function renderWithProviders(ui) {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {ui}
      </LocalizationProvider>
    </ThemeProvider>
  );
}

describe('Expenses form smoke', () => {
  it('renders add expense button', async () => {
    renderWithProviders(
      <ToastProvider>
        <ModalProvider>
          <Expenses session={null} budget={{ id: 1, is_owner: true }} />
        </ModalProvider>
      </ToastProvider>
    );
    const btn = await screen.findByText(/Dodaj wydatek/i);
    expect(btn).toBeTruthy();
  });
});
