import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    base: '/',
    build: {
      rollupOptions: {
        output: {
          // 厂商依赖独立分包:主包只留业务代码,长缓存友好
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('radix-ui') || id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('marked') || id.includes('highlight.js') || id.includes('dompurify')) {
              return 'vendor-markdown';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('cytoscape')) {
              return 'vendor-cytoscape';
            }
            return 'vendor-misc';
          },
        },
      },
    },
    test: {
      setupFiles: ['./src/test/setup.ts'],
      environmentOptions: {
        jsdom: {
          url: 'http://localhost/',
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
