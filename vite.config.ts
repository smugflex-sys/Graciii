import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      // Remove all plugins that could trigger virus scanners
      // No compression, no bundle analyzer, no image optimizer
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    build: {
      outDir: 'public_html',
      emptyOutDir: true,
      sourcemap: false, // Disable sourcemaps
      
      // Ultra-conservative build settings
      target: 'es2015', // Conservative target
      minify: 'esbuild', // Use esbuild instead of terser
      
      rollupOptions: {
        output: {
          // Simple chunking to avoid complex patterns
          manualChunks: undefined,
          
          // Clean file naming
          entryFileNames: 'assets/js/[name].js',
          chunkFileNames: 'assets/js/[name].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            if (/(png|jpe?g|svg|gif|webp|avif)$/i.test(name)) {
              return 'assets/images/[name][extname]';
            }
            if (/css$/i.test(name)) {
              return 'assets/css/[name].css';
            }
            return 'assets/[name][extname]';
          },
        },
        
        // External dependencies that might cause issues
        external: [],
      },
      
      // Conservative chunk sizes
      chunkSizeWarningLimit: 1000,
      
      // No asset inlining
      assetsInlineLimit: 0,
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      open: false, // Disable auto-open
      proxy: {
        '^/api': {
          target: isProduction ? 'https://gracelandroyalacademy.com.ng' : 'http://localhost:8000',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
    },

    preview: {
      port: 4173,
      host: '0.0.0.0',
      strictPort: true,
    },

    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        isProduction 
          ? 'https://gracelandroyalacademy.com.ng/api' 
          : 'http://localhost:8000/api'
      ),
    },

    // Conservative CSS handling
    css: {
      devSourcemap: false,
      preprocessorOptions: {},
    },

    // No environment variables that could cause issues
    envPrefix: 'VITE_',
  };
});
