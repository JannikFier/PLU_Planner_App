/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseTarget = (
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).replace(/\/$/, '')
  const isLocalHttpTarget =
    supabaseTarget.startsWith('http://localhost') ||
    supabaseTarget.startsWith('http://127.0.0.1')
  const functionsProxy = supabaseTarget
    ? {
        '/functions/v1': {
          target: supabaseTarget,
          changeOrigin: true,
          // Lokales Supabase (CLI) laeuft ohne TLS
          secure: !isLocalHttpTarget,
        },
      }
    : undefined

  return {
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // Edge Functions: gleiche Origin wie die App → kein CORS; Weiterleitung an VITE_SUPABASE_URL
    proxy: functionsProxy,
  },
  preview: {
    port: 4173,
    // npm run preview: gleicher Proxy wie im Dev-Server (lokales Supabase + gebautes Bundle)
    proxy: functionsProxy,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          dndkit: ['@dnd-kit/core', '@dnd-kit/modifiers', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          exceljs: ['exceljs'],
          jspdf: ['jspdf'],
          ui: ['sonner'],
        },
      },
    },
  },
  }
})
