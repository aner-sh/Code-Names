import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['bufferutil', 'utf-8-validate'],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`
        input: 'electron/preload.ts',
      },
      // Optional: Polfills node/electron APIs for the renderer process
      renderer: {},
    }),
  ],
});