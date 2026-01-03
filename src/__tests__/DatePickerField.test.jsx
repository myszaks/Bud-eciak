import React from 'react';
import { render, screen } from '@testing-library/react';
import DatePickerField from '../components/DatePickerField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, it, expect } from 'vitest';

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

describe('DatePickerField', () => {
  it('renders an input textbox', async () => {
    renderWithProviders(<DatePickerField value={null} onChange={() => {}} />);
    const input = await screen.findByRole('textbox');
    expect(input).toBeTruthy();
  });
});
