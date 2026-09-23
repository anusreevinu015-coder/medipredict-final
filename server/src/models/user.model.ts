import { pool } from '../config/database.js';
import type { SessionRow, UserRow } from '../types/auth.js';

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: 'patient' | 'admin';
}): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.email, data.passwordHash, data.role ?? 'patient'],
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createSession(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<SessionRow> {
  const result = await pool.query<SessionRow>(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.userId, data.tokenHash, data.expiresAt],
  );
  return result.rows[0];
}

export async function findSessionUser(tokenHash: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}