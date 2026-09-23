import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import {
  createReport,
  findOwnedReport,
  listReportsByUser,
  storeExtraction,
} from '../models/report.model.js';
import type { Report } from '../types/auth.js';
import { reportsDir } from '../utils/report-upload.js';
import { analyzeReport } from '../services/ocr.js';

function toSafeReport(report: Report) {
  return {
    id: report.id,
    userId: report.userId,
    originalFilename: report.originalFilename,
    fileType: report.fileType,
    fileSize: report.fileSize,
    status: report.status,
    extraction: report.extraction,
    createdAt: report.createdAt,
  };
}

export const listReports = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reports = await listReportsByUser(req.user!.id);
  res.status(200).json({ reports: reports.map(toSafeReport) });
});

export const uploadReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ message: 'No file was uploaded. Please choose a report file first.' });
    return;
  }

  let report: Report;
  try {
    report = await createReport({
      userId: req.user!.id,
      originalFilename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath: file.filename,
    });
  } catch (err) {
    fs.promises.unlink(path.join(reportsDir, path.basename(file.filename))).catch(() => undefined);
    throw err;
  }

  const filePath = path.join(reportsDir, path.basename(report.storagePath));
  try {
    const analysis = await analyzeReport(filePath, report.fileType);
    report = await storeExtraction(report.id, analysis, 'pending_confirmation');
    res.status(201).json({
      report: toSafeReport(report),
      message:
        analysis.items.length > 0
          ? 'Report uploaded and read automatically. Review the extracted values, correct anything wrong, then confirm to make the data available to the AI assistant.'
          : 'Report uploaded, but we could not reliably read the values. Please review the hint below or upload a clearer file.',
    });
  } catch (err) {
    report = await storeExtraction(
      report.id,
      {
        quality: 'low',
        text: null,
        items: [],
        reportDate: null,
        diagnoses: [],
        medicines: [],
        notes: 'Automatic extraction failed. Please upload a clearer scan or photo of the report.',
      },
      'failed',
    );
    res.status(201).json({
      report: toSafeReport(report),
      message: 'Report uploaded. Automatic extraction failed — please upload a clearer file to read the values.',
    });
  }
});

const extractionItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  testName: z.string().trim().min(1, 'Test name cannot be empty.').max(200),
  value: z.string().trim().max(100),
  unit: z.string().trim().max(100),
  reference: z.string().trim().max(100),
  indicator: z.enum(['high', 'low', 'abnormal', 'normal']).nullable(),
});

const saveExtractionSchema = z.object({
  items: z.array(extractionItemSchema).max(200),
  reportDate: z.string().trim().max(50).nullable(),
  diagnoses: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  medicines: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  notes: z.string().trim().max(5000).nullable(),
  quality: z.enum(['readable', 'low']).nullable(),
});

export const saveExtraction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const report = await findOwnedReport(req.params.id ?? '', req.user!.id);
  if (!report) {
    res.status(404).json({ message: 'Report not found.' });
    return;
  }

  const parsed = saveExtractionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const updated = await storeExtraction(
    report.id,
    {
      quality: data.quality,
      text: report.extraction.text,
      items: data.items,
      reportDate: data.reportDate,
      diagnoses: data.diagnoses,
      medicines: data.medicines,
      notes: data.notes,
    },
    'pending_confirmation',
  );

  res.status(200).json({ report: toSafeReport(updated), message: 'Draft saved. Confirm when you are happy with the values.' });
});

export const confirmExtraction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const report = await findOwnedReport(req.params.id ?? '', req.user!.id);
  if (!report) {
    res.status(404).json({ message: 'Report not found.' });
    return;
  }

  if (report.extraction.status === 'none' || report.extraction.status === 'processing' || report.extraction.status === 'failed') {
    res.status(400).json({ message: 'This report has no readable extraction to confirm yet.' });
    return;
  }

  const updated = await storeExtraction(
    report.id,
    {
      quality: report.extraction.quality,
      text: report.extraction.text,
      items: report.extraction.items,
      reportDate: report.extraction.reportDate,
      diagnoses: report.extraction.diagnoses,
      medicines: report.extraction.medicines,
      notes: report.extraction.notes,
    },
    'confirmed',
  );

  res.status(200).json({
    report: toSafeReport(updated),
    message: 'Report data confirmed. The AI health assistant can now consider these results.',
  });
});

export const getReportFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const report = await findOwnedReport(req.params.id ?? '', req.user!.id);
  if (!report) {
    res.status(404).json({ message: 'Report not found.' });
    return;
  }

  const fileName = path.basename(report.storagePath);
  const filePath = path.join(reportsDir, fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Report file is missing.' });
    return;
  }

  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(report.originalFilename)}"`);
  res.sendFile(filePath);
});