import { pool } from '../config/database.js';
import type { MedicalHistory } from '../types/auth.js';

interface MedicalHistoryRow {
  user_id: string;
  conditions: string | null;
  allergies: string | null;
  medications: string | null;
  surgeries: string | null;
  family_history: string | null;
  notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

function toMedicalHistory(row: MedicalHistoryRow): MedicalHistory {
  return {
    userId: row.user_id,
    conditions: row.conditions,
    allergies: row.allergies,
    medications: row.medications,
    surgeries: row.surgeries,
    familyHistory: row.family_history,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findMedicalHistory(userId: string): Promise<MedicalHistory | null> {
  const result = await pool.query<MedicalHistoryRow>(
    'SELECT * FROM medical_histories WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ? toMedicalHistory(result.rows[0]) : null;
}

export async function upsertMedicalHistory(data: {
  userId: string;
  conditions: string | null;
  allergies: string | null;
  medications: string | null;
  surgeries: string | null;
  familyHistory: string | null;
  notes: string | null;
}): Promise<MedicalHistory> {
  const result = await pool.query<MedicalHistoryRow>(
    `INSERT INTO medical_histories
       (user_id, conditions, allergies, medications, surgeries, family_history, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       conditions = EXCLUDED.conditions,
       allergies = EXCLUDED.allergies,
       medications = EXCLUDED.medications,
       surgeries = EXCLUDED.surgeries,
       family_history = EXCLUDED.family_history,
       notes = EXCLUDED.notes,
       updated_at = now()
     RETURNING *`,
    [
      data.userId,
      data.conditions,
      data.allergies,
      data.medications,
      data.surgeries,
      data.familyHistory,
      data.notes,
    ],
  );
  return toMedicalHistory(result.rows[0]);
}