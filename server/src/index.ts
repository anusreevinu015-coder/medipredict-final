import { createApp } from './app.js';
import { env } from './config/env.js';
import { pingDatabase } from './config/database.js';

async function bootstrap(): Promise<void> {
  const dbOk = await pingDatabase();
  if (!dbOk) {
    console.warn(
      '[server] Could not reach PostgreSQL. Authentication endpoints will fail until it is up.\n' +
        '          Make sure PostgreSQL is running and DATABASE_URL is correct, then run: npm run db:init',
    );
  } else {
    console.log('[server] PostgreSQL connection OK.');
  }

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] Medipredict API listening on http://localhost:${env.port}`);
    console.log(`[server] Environment: ${env.nodeEnv}`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});