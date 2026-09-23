import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { getProfile, updateProfile } from '../controllers/patient.controller.js';
import {
  getMedicalHistory,
  updateMedicalHistory,
} from '../controllers/medical-history.controller.js';
import {
  confirmExtraction,
  getReportFile,
  listReports,
  saveExtraction,
  uploadReport,
} from '../controllers/report.controller.js';
import {
  bookAppointment,
  listMyAppointments,
} from '../controllers/appointment.controller.js';
import {
  listMyFeedback,
  submitFeedback,
} from '../controllers/feedback.controller.js';
import { reportUpload } from '../utils/report-upload.js';

const router = Router();

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/medical-history', getMedicalHistory);
router.put('/medical-history', updateMedicalHistory);

router.get('/reports', listReports);
router.get('/reports/:id/file', getReportFile);
router.put('/reports/:id/extraction', saveExtraction);
router.post('/reports/:id/confirm', confirmExtraction);

router.get('/appointments', listMyAppointments);
router.post('/appointments', bookAppointment);

router.get('/feedback', listMyFeedback);
router.post('/feedback', submitFeedback);

function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  reportUpload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ message: 'File exceeds the 10 MB limit.' });
        return;
      }
      res.status(400).json({ message: 'Upload failed.' });
      return;
    }
    if (err instanceof Error && (err as Error & { isUserFacing?: boolean }).isUserFacing) {
      res.status(400).json({ message: err.message });
      return;
    }
    console.error('[upload]', err);
    res.status(400).json({ message: 'Upload failed.' });
  });
}

router.post('/reports', uploadMiddleware, uploadReport);

export default router;