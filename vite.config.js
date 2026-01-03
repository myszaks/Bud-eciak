import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
    // Keep default Rollup chunking; manualChunks removed to avoid potential CJS wrapping issues
    rollupOptions: {
      output: {
        chunkSizeWarningLimit: 1200,
      },
    },
    // Use esbuild for minification to avoid requiring optional terser dependency
    minify: mode === 'production' ? 'esbuild' : false,
  },
  esbuild: {
    // Drop console/debugger in production builds
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // No external terser dependency required now; esbuild handles minification.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}))
