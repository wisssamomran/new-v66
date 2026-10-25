import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function preventDataReloadPlugin() {
  return {
    name: 'prevent-data-reload',
    configureServer(server: any) {
      const origSend = server.ws.send;
      server.ws.send = function(...args: any[]) {
        const payload = args[0];
        if (payload && payload.type === 'full-reload') {
          const pathStr = (payload.path || '').replace(/\\/g, '/');
          if (
            !pathStr ||
            pathStr === '*' ||
            pathStr.includes('_dalani_store_') ||
            pathStr.includes('.dalani_cache') ||
            pathStr.includes('.json') ||
            pathStr.includes('database') ||
            pathStr.includes('.data') ||
            pathStr.includes('backups')
          ) {
            return;
          }
        }
        return origSend.apply(this, args);
      };
    },
    handleHotUpdate({ file }: { file: string }) {
      const normalized = file.replace(/\\/g, '/');
      if (
        normalized.includes('_dalani_store_') ||
        normalized.includes('.dalani_cache') ||
        normalized.includes('.data') ||
        normalized.endsWith('.json') ||
        normalized.includes('database') ||
        normalized.includes('backups') ||
        normalized.includes('.env')
      ) {
        return [];
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), preventDataReloadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? {
        ignored: ['**']
      } : {
        usePolling: false,
        ignored: (filePath: string) => {
          const normalized = filePath.replace(/\\/g, '/');
          return (
            normalized.includes('/_dalani_store_/') ||
            normalized.includes('_dalani_store_') ||
            normalized.includes('/.dalani_cache/') ||
            normalized.includes('.dalani_cache') ||
            normalized.includes('/.data/') ||
            normalized.includes('/node_modules/') ||
            normalized.includes('/.git/') ||
            normalized.includes('/backups/') ||
            normalized.endsWith('.json')
          );
        }
      },
    },
  };
});
