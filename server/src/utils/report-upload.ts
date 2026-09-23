import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/pjpeg',
  'image/png',
]);

export const reportsDir = path.join(env.uploadsDir, 'reports');

fs.mkdirSync(reportsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reportsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `report-${crypto.randomUUID()}${ext}`);
  },
});

export function isAllowedFile(mimetype: string, originalname: string): boolean {
  const ext = path.extname(originalname).toLowerCase();
  return ALLOWED_MIME_TYPES.has(mimetype) && ALLOWED_EXTENSIONS.has(ext);
}

export const reportUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFile(file.mimetype, file.originalname)) {
      const error: Error & { isUserFacing?: boolean } = new Error(
        'Unsupported file type. Please upload a PDF, JPG, JPEG or PNG file.',
      );
      error.isUserFacing = true;
      cb(error);
      return;
    }
    cb(null, true);
  },
});