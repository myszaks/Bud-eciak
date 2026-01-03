import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { terser } from 'rollup-plugin-terser'
import path from 'path'

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Nasłuchuj na wszystkich interfejsach sieciowych
    port: 5173,
  },
  build: {
    // Disable source maps in production to avoid exposing source code
    sourcemap: false,
    rollupOptions: {},
    // Use terser in production to drop console statements
    minify: mode === 'production' ? 'terser' : false,
  },
  esbuild: {
    // Keep esbuild sourcemap handling default; build.sourcemap controls production output
  },
  // Add terser plugin config via rollup if building for production
  ...(mode === 'production' && {
    plugins: [react(), terser({ format: { comments: false }, compress: { drop_console: true } })],
  }),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}))
