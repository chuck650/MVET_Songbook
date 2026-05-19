import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import fs from 'fs';

// Read our single source of truth for the version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const base = isGithubPages ? '/MVET_Songbook/' : '/';

export default defineConfig({
  base: base,
  plugins: [
    react(),
    {
      name: 'version-logger',
      closeBundle() {
        console.log(`\n✅ Built MVET Songbook App Version: v${appVersion}\n`);
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // Increase to 20MiB for high-res scores and audio
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /songs\.json/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'manifest-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /\.(?:mp3|flac)(?:\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              plugins: [
                {
                  // This is the magic for seeking in cached audio
                  cachedResponseWillBeUsed: async ({ cacheName, request, matchOptions, cachedResponse }) => {
                    if (cachedResponse && request.headers.has('range')) {
                      return cachedResponse;
                    }
                    return cachedResponse;
                  },
                },
              ],
              rangeRequests: true,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /\.(?:mxl|pdf|mscz)(?:\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'song-files-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'MVET Songbook',
        short_name: 'Songbook',
        description: 'Digital resource for veteran-focused vocal arrangements',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: isGithubPages ? '/MVET_Songbook/songbook/' : '/songbook/',
        start_url: isGithubPages ? '/MVET_Songbook/songbook/' : '/songbook/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        songbook: resolve(__dirname, 'songbook/index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('opensheetmusicdisplay')) {
              return 'vendor-osmd';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
