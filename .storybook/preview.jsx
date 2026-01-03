import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import theme from '../src/theme';

dayjs.locale('pl');

export const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pl">
        <CssBaseline />
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  ),
];

// Storybook 8 no longer recommends using `argTypesRegex` to implicitly
// mock action handlers. Prefer explicitly mocking functions in stories
// using `(fn)` from `@storybook/addon-actions` when needed.
export const parameters = {
  controls: { expanded: true },
};
export const tags = ['autodocs'];
