import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Syndic — Gestion de copropriété',
        short_name: 'Syndic',
        description: 'Gestion transparente de votre copropriété',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1d30',
        theme_color: '#2c5282',
        lang: 'fr',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Mise en cache de l'app shell pour un démarrage rapide / hors-ligne basique.
        // Les données Supabase ne sont PAS mises en cache (toujours fraîches).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes('supabase'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
})
