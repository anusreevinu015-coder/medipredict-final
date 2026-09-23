import { pool } from '../config/database.js';

const sample = await pool.query(
  `SELECT h.id, h.name
   FROM hospitals h WHERE h.name LIKE '%(Sample)%'`,
);
for (const row of sample.rows as { id: string; name: string }[]) {
  const removed = await pool.query(
    `DELETE FROM appointments WHERE hospital_id = $1 RETURNING id`,
    [row.id],
  );
  console.log(`[cleanup] Deleted ${removed.rowCount} appointment(s) for ${row.name}`);
}
const gone = await pool.query(`DELETE FROM hospitals WHERE name LIKE '%(Sample)%' RETURNING name`);
console.log(`[cleanup] Deleted ${gone.rowCount} sample hospital(s)`);

const remaining = await pool.query(`SELECT count(*)::int AS n FROM hospitals`);
console.log('REMAINING HOSPITALS:', remaining.rows[0].n);
await pool.end();