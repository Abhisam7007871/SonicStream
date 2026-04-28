/**
 * Unified Server: Express API + Next.js Frontend on ONE port.
 * 
 * This is the production entry point for Render deployment.
 * - All /api/* and /health routes are handled by Express (backend)
 * - Everything else is handled by Next.js (frontend)
 */

const { createServer } = require('http');
const next = require('next');
const path = require('path');

// Load backend .env
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function main() {
  // 0. Ensure SQLite DB file exists (Render has ephemeral filesystem)
  const dbPath = path.join(__dirname, 'backend', 'prisma', 'dev.db');
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) {
    console.log('Creating SQLite database...');
    const { execSync } = require('child_process');
    try {
      execSync('npx prisma db push --schema=prisma/schema.prisma --skip-generate', {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'inherit',
      });
    } catch (e) {
      // If db push fails, just create an empty file — tables will be created on first migration
      fs.writeFileSync(dbPath, '');
    }
  }

  // 1. Boot Next.js
  const nextApp = next({ dev, dir: __dirname });
  const nextHandler = nextApp.getRequestHandler();
  await nextApp.prepare();
  console.log('✓ Next.js ready');

  // 2. Boot Express backend (imports all API routes)
  let expressApp;
  try {
    if (dev) {
      // In dev, use ts-node to load TypeScript directly
      require('ts-node').register({
        transpileOnly: true,
        project: path.join(__dirname, 'backend', 'tsconfig.json'),
      });
      const backend = require('./backend/src/index.ts');
      expressApp = backend.app;
    } else {
      // In production, use pre-compiled JavaScript
      const backend = require('./backend/dist/index.js');
      expressApp = backend.app;
    }
    console.log('✓ Express API ready');
  } catch (err) {
    console.error('✗ Failed to load Express backend:', err.message);
    console.error(err);
    process.exit(1);
  }

  // 3. Create unified HTTP server
  const server = createServer((req, res) => {
    // Route /api/* and /health to Express
    if (req.url.startsWith('/api/') || req.url === '/health') {
      expressApp(req, res);
    } else {
      // Everything else goes to Next.js
      nextHandler(req, res);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SonicStream running on port ${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   API:      http://localhost:${PORT}/api/`);
    console.log(`   Health:   http://localhost:${PORT}/health`);
    console.log(`   Mode:     ${dev ? 'development' : 'production'}\n`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
