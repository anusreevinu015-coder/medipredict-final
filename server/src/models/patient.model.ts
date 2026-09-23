import { pool } from '../config/database.js';
import type { PatientProfile } from '../types/auth.js';

interface PatientProfileRow {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'admin';
  created_at: Date;
  phone: string | null;
  date_of_birth: Date | string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  updated_at: Date | null;
}

function toDateOnly(value: Date | string | null): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getPatientProfile(userId: string): Promise<PatientProfile | null> {
  const result = await pool.query<PatientProfileRow>(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            p.phone, p.date_of_birth, p.gender, p.address, p.updated_at
     FROM users u
     LEFT JOIN patient_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    phone: row.phone,
    dateOfBirth: toDateOnly(row.date_of_birth),
    gender: row.gender,
    address: row.address,
    updatedAt: row.updated_at,
  };
}

export async function updatePatientProfile(data: {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
}): Promise<PatientProfile> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [
      data.name,
      data.email,
      data.userId,
    ]);

    await client.query(
      `INSERT INTO patient_profiles (user_id, phone, date_of_birth, gender, address)
       VALUES ($1, $2, $3::date, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         phone = EXCLUDED.phone,
         date_of_birth = EXCLUDED.date_of_birth,
         gender = EXCLUDED.gender,
         address = EXCLUDED.address,
         updated_at = now()`,
      [data.userId, data.phone, data.dateOfBirth, data.gender, data.address],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  const profile = await getPatientProfile(data.userId);
  if (!profile) {
    throw new Error('Failed to load updated profile.');
  }
  return profile;
}