import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db';
import { runAutoMigrationAndSeeding } from './src/db/migrateAndSeed';
import { authMiddleware } from './src/server/rbac';
import { isIpBlockedInDatabase } from './src/server/supabaseServer';
import { registerModularRoutes } from './src/server/modules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Port 3000 & iFrame: Dev server must run on port 3000. Do not inherit external container PORT (e.g. 8080 used by Nginx).
const PORT = 3000;

// Express Trust Proxy setup for Cloud environment / Reverse Proxy
app.set('trust proxy', 1);

// CORS & Headers Middleware for Capacitor Mobile App and External Clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-role, x-user-id, x-session-id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// IP Block Guard Middleware (Asynchronous database-backed with in-memory TTL fast-path)
const ipBlockGuard = async (req: Request, res: Response, next: any) => {
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const cleanIp = rawIp.replace('::ffff:', '').trim();

  // 1. Direct database check
  const isBlockedDb = await isIpBlockedInDatabase(cleanIp);

  // 2. Secondary fallback check
  const blockedList = db.getBlockedIps ? db.getBlockedIps() : [];
  const isBlockedLocal = blockedList.some(b => (b.ip === rawIp || (b as any).ipAddress === rawIp || b.ip === cleanIp));

  if (isBlockedDb || isBlockedLocal) {
    return res.status(403).json({ error: 'تم حظر هذا العنوان (IP) من الوصول لخدمات المنصة لمخالفة معايير الأمان.' });
  }
  next();
};

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global IP Guard & Auth Middleware
app.use(ipBlockGuard);
app.use(authMiddleware);

// ==========================================
// REGISTER 6 SUBSYSTEMS & SHARED ROUTERS
// ==========================================
registerModularRoutes(app);

// ==========================================
// CLIENT SERVING (Vite Dev & Production)
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Run database migration and initial seeding
  try {
    const migration = await runAutoMigrationAndSeeding();
    console.log('[Dalani Startup] Auto-migration result:', migration.message);
    if (migration.usingPostgres && migration.success) {
      await db.loadFromPostgres();
    }
  } catch (err) {
    console.error('[Dalani Startup] Error during database auto-migration:', err);
  }

  if (!isProduction) {
    // In development mode, dynamically hook Vite middlewares into Express
    const { createServer } = await import('vite');
    const vite = await createServer({
      plugins: [
        {
          name: 'prevent-data-reload',
          configureServer(server) {
            // Intercept ws.send to prevent full-page reload on data or json writes
            const origSend = server.ws.send.bind(server.ws);
            server.ws.send = function(first: any, second?: any) {
              const payload = typeof first === 'object' ? first : second;
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
              return (origSend as any)(first, second);
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
        }
      ],
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR === 'true' ? false : {
          overlay: false
        },
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
        }
      },
      appType: 'spa'
    });

    // Explicitly unwatch database data directory to prevent full page reloads on persistence
    if (vite.watcher) {
      const dbPath = path.resolve(process.cwd(), '_dalani_store_');
      const dbFile = path.resolve(dbPath, 'dalani_database.json');
      const backupsPath = path.resolve(dbPath, 'backups');

      vite.watcher.unwatch([
        dbPath,
        dbFile,
        backupsPath,
        '**/_dalani_store_/**',
        '**/dalani_database.json'
      ]);

      vite.watcher.on('all', (_event, filePath) => {
        if (filePath.includes('_dalani_store_') || filePath.endsWith('.json')) {
          // No reload triggered
        }
      });
    }

    app.use(vite.middlewares);
    console.log('[Dalani Server] Modular routers mounted. Vite middlewares attached.');
  } else {
    // In production, serve pre-built assets from /dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 [Dalani Modular Monolith] Server Running on Port ${PORT}`);
    console.log(`📡 All 6 Subsystem APIs live at http://0.0.0.0:${PORT}/api/*`);
    console.log(`🔒 RBAC & Security Guard: ACTIVE`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('[Dalani Server] Fatal error starting server:', err);
  process.exit(1);
});
