import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Sin caché de nada: RODE no tiene modo sin conexión (decisión del proyecto).
      // El service worker existe solo porque algunos navegadores lo piden para
      // permitir "Agregar a pantalla de inicio"; no guarda ninguna página ni dato.
      // navigateFallback: null es importante — sin esto, por defecto serviría una
      // copia guardada de la página aunque no haya internet, que es justo el
      // comportamiento "sin conexión" que se decidió no tener.
      // runtimeCaching con NetworkOnly: Workbox exige alguna regla configurada o
      // no genera el service worker; esta regla dice "nunca guardes nada, ve
      // siempre a la red", que en la práctica sigue siendo cero caché.
      workbox: {
        globPatterns: [],
        navigateFallback: null,
        runtimeCaching: [{ urlPattern: () => true, handler: 'NetworkOnly' }],
      },
      includeManifestIcons: false,
      // Para poder probar la instalación con `npm run dev`, sin tener que compilar.
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        lang: 'es',
        name: 'RODE',
        short_name: 'RODE',
        description: 'Gestión de inventario para el emprendimiento de repostería RODE',
        start_url: '/',
        display: 'standalone',
        background_color: '#fbf8f4',
        theme_color: '#2b1d18',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    // El navegador habla solo con este servidor (mismo origen) y Vite reenvía
    // /api al backend. Así la cookie de sesión funciona sin configurar CORS.
    proxy: { '/api': 'http://localhost:3000' },
    // host true: además de localhost, escucha en la red local, para poder abrir
    // la app desde el celular mientras están en el mismo Wi-Fi.
    host: true,
  },
})
