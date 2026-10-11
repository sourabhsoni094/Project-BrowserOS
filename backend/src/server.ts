import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/db.js';
import { seedDummyUsers } from './services/seed.service.js';

const app = createApp();

async function startServer() {
  try {
    // Verify DB connectivity
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL successfully.');

    // Auto-seed default users if database is empty/fresh
    await seedDummyUsers();

    const server = app.listen(ENV.PORT, () => {
      console.log(`[BrowserOS Backend] Server running on http://localhost:${ENV.PORT}`);
    });

    const shutdown = async () => {
      console.log('\n[BrowserOS Backend] Gracefully shutting down...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('[BrowserOS Backend] Closed HTTP server and DB connection.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[BrowserOS Backend] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
