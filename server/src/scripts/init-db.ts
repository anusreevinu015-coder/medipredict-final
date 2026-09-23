import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initDb(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  const seedPath = path.resolve(__dirname, '../db/seed-hospitals.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');

  console.log('[db:init] Connecting to PostgreSQL...');
  await pool.query(schemaSql);
  console.log('[db:init] Tables created / verified. Done.');

  const shouldSeed = process.argv.includes('--seed');
  if (shouldSeed) {
    console.log('[db:init] --seed detected. Loading sample hospital data...');
    const seedSql = await readFile(seedPath, 'utf8');
    await pool.query(seedSql);
    console.log('[db:init] Sample hospitals, departments and doctors seeded.');
  } else {
    console.log(
      '[db:init] No sample data loaded. Use "npm run db:init -- --seed" to load the optional sample hospitals for testing.',
    );
  }

  // Remove any leftover "(Sample)" development records so the hospital,
  // doctor and booking workflows only use real administrator-managed data.
  // Hospitals that already have booked appointments are kept (data integrity).
  const cleanup = await pool.query(
    `DELETE FROM hospitals h
     WHERE h.name LIKE '%(Sample)%'
       AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.hospital_id = h.id)
     RETURNING id, name`,
  );
  if (cleanup.rowCount && cleanup.rowCount > 0) {
    console.log(
      `[db:init] Removed ${cleanup.rowCount} leftover sample hospital(s) (including their departments and doctors).`,
    );
  }
  const remaining = await pool.query(
    `SELECT name FROM hospitals WHERE name LIKE '%(Sample)%' LIMIT 5`,
  );
  if (remaining.rowCount && remaining.rowCount > 0) {
    console.warn(
      '[db:init] Warning: sample hospital(s) with booked appointments still exist and were kept for data integrity. Reject/remove their bookings in the admin panel to delete them.',
    );
  }

  await pool.end();
}

initDb().catch(async (err) => {
  console.error('[db:init] Failed:', err.message);
  await pool.end().catch(() => undefined);
  process.exit(1);
});