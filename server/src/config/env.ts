import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: bool(process.env.NODE_ENV, false) && process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/medipredict',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  uploadsDir: process.env.UPLOAD_DIR ?? path.resolve(__dirname, '../../uploads'),
};

if (!env.sessionSecret || env.sessionSecret.length < 32) {
  throw new Error(
    'SESSION_SECRET must be set and at least 32 characters long. ' +
      'See server/.env.example for instructions.',
  );
}