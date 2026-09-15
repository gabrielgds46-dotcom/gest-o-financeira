import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',   // avisamos o usuário em vez de recarregar sozinho
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Finanças do Casal',
        short_name: 'Finanças',
        description: 'Gestão financeira pessoal e compartilhada do casal',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#09090b',
        theme_color: '#09090b',
        // Dois conjuntos, de propósito. O Android RECORTA o ícone maskable na
        // forma do tema do aparelho (círculo, gota, quadrado arredondado), e
        // come cerca de 10% de cada borda. Declarar a mesma arte nos dois
        // papéis decepava a seta em cima e o dinheiro embaixo.
        //
        // Os arquivos -maskable trazem a MESMA ilustração encolhida para 76%
        // sobre o verde, então o recorte só come fundo. Os sem sufixo ficam
        // inteiros para onde não há recorte (aba do navegador, iOS, splash).
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Segurar o ícone na home abre direto na tela de lançamento.
        shortcuts: [
          {
            name: 'Lançar',
            short_name: 'Lançar',
            description: 'Registrar um novo gasto',
            url: '/lancar',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],   // atalho: sem recorte
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Os handlers de push vivem num arquivo à parte (public/push-sw.js).
        importScripts: ['push-sw.js'],
        navigateFallback: '/index.html',
        // Nunca cachear chamadas ao Supabase: dado financeiro tem que ser fresco.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
