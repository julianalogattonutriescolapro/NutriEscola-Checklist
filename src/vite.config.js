import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['apple-touch-icon.png'],
            manifest: {
                name: 'Logatto Flow Finance',
                short_name: 'Flow Finance',
                description: 'Assistente financeiro pessoal — elegante, inteligente e completo.',
                theme_color: '#A8C3A0',
                background_color: '#FBF7F0',
                display: 'standalone',
                start_url: '/',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            workbox: {
                // Cache de assets estáticos; dados do Supabase seguem "network first"
                // via lógica própria no cliente (fila de sincronização offline).
                globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
                // Garante que abrir/recarregar qualquer rota (ex: /despesas) offline
                // ainda carregue o app (SPA), em vez de uma página em branco/erro.
                navigateFallback: '/index.html',
                runtimeCaching: [
                    {
                        urlPattern: function (_a) {
                            var url = _a.url;
                            return url.origin.includes('supabase.co');
                        },
                        handler: 'NetworkFirst',
                        options: { cacheName: 'supabase-api', networkTimeoutSeconds: 8 }
                    },
                    {
                        urlPattern: function (_a) {
                            var url = _a.url;
                            return url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com');
                        },
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts',
                            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    }
                ]
            }
        })
    ],
    server: { port: 5173 }
});
