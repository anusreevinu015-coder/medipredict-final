import { pool } from '../config/database.js';
import type {
  ExtractionQuality,
  ExtractedItem,
  Report,
  ReportExtraction,
  ReportStatus,
} from '../types/auth.js';

interface ReportRow {
  id: string;
  user_id: string;
  original_filename: string;
  file_type: string;
  file_size: string;
  storage_path: string;
  status: ReportStatus;
  extraction_status: string;
  extraction_quality: string | null;
  extraction_text: string | null;
  extraction_items: unknown;
  extraction_report_date: string | null;
  extraction_diagnoses: unknown;
  extraction_medicines: unknown;
  extraction_notes: string | null;
  created_at: Date;
}

function toExtraction(row: ReportRow): ReportExtraction {
  const items: ExtractedItem[] = Array.isArray(row.extraction_items) ? (row.extraction_items as ExtractedItem[]) : [];
  const diagnoses: string[] = Array.isArray(row.extraction_diagnoses) ? (row.extraction_diagnoses as string[]) : [];
  const medicines: string[] = Array.isArray(row.extraction_medicines) ? (row.extraction_medicines as string[]) : [];
  return {
    status: row.extraction_status as ReportExtraction['status'],
    quality: (row.extraction_quality ?? null) as ExtractionQuality | null,
    text: row.extraction_text,
    items,
    reportDate: row.extraction_report_date,
    diagnoses,
    medicines,
    notes: row.extraction_notes,
  };
}

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    userId: row.user_id,
    originalFilename: row.original_filename,
    fileType: row.file_type,
    fileSize: Number(row.file_size),
    storagePath: row.storage_path,
    status: row.status,
    extraction: toExtraction(row),
    createdAt: row.created_at,
  };
}

export async function createReport(data: {
  userId: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  status?: ReportStatus;
}): Promise<Report> {
  const result = await pool.query<ReportRow>(
    `INSERT INTO reports (user_id, original_filename, file_type, file_size, storage_path, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.userId,
      data.originalFilename,
      data.fileType,
      data.fileSize,
      data.storagePath,
      data.status ?? 'pending_review',
    ],
  );
  return toReport(result.rows[0]);
}

export async function listReportsByUser(userId: string): Promise<Report[]> {
  const result = await pool.query<ReportRow>(
    'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return result.rows.map(toReport);
}

export async function listConfirmedReports(userId: string): Promise<Report[]> {
  const result = await pool.query<ReportRow>(
    `SELECT * FROM reports
     WHERE user_id = $1 AND extraction_status = 'confirmed'
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows.map(toReport);
}

export async function findOwnedReport(reportId: string, userId: string): Promise<Report | null> {
  const result = await pool.query<ReportRow>(
    'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
    [reportId, userId],
  );
  return result.rows[0] ? toReport(result.rows[0]) : null;
}

export async function storeExtraction(
  reportId: string,
  extraction: Omit<ReportExtraction, 'status'>,
  status: ReportExtraction['status'],
): Promise<Report> {
  const result = await pool.query<ReportRow>(
    `UPDATE reports
     SET extraction_status = $2,
         extraction_quality = $3,
         extraction_text = $4,
         extraction_items = $5,
         extraction_report_date = $6,
         extraction_diagnoses = $7,
         extraction_medicines = $8,
         extraction_notes = $9,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      reportId,
      status,
      extraction.quality,
      extraction.text,
      JSON.stringify(extraction.items),
      extraction.reportDate,
      JSON.stringify(extraction.diagnoses),
      JSON.stringify(extraction.medicines),
      extraction.notes,
    ],
  );
  if (!result.rows[0]) {
    throw new Error('Report not found.');
  }
  return toReport(result.rows[0]);
}