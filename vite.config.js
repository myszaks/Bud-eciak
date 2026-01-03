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
    // Improve chunking to avoid very large vendor bundles
    rollupOptions: {
      output: {
        chunkSizeWarningLimit: 1200, // increase warning to 1.2MB; tune as needed
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor_react';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor_mui';
            if (id.includes('recharts') || id.includes('chart')) return 'vendor_charts';
            if (id.includes('lodash')) return 'vendor_lodash';
            return 'vendor_misc';
          }
        },
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
