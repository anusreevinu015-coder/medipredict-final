import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import chatRoutes from './chat.routes.js';
import hospitalRoutes from './hospital.routes.js';
import adminRoutes from './admin.routes.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { listServiceLocations } from '../models/hospital.model.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', name: 'Medipredict API' });
});

// The eight selectable service locations (public reference data only, no
// patient information) used by the location picker.
router.get(
  '/locations',
  asyncHandler(async (_req, res) => {
    const locations = await listServiceLocations();
    res.status(200).json({ locations });
  }),
);

router.get('/dashboard', requireAuth, (req, res) => {
  if (req.user?.role === 'admin') {
    res.status(200).json({ home: 'admin' });
    return;
  }
  res.status(200).json({ home: 'patient' });
});

// Protected patient endpoints. Role guards ensure only the logged-in patient
// can access their own data (the user id always comes from the session).
router.use('/patient', requireAuth, requireRole('patient'), patientRoutes);

// Admin-only endpoints (appointment management etc.).
router.use('/admin', requireAuth, requireRole('admin'), adminRoutes);

// AI health assistant chat (patient-only; message user id comes from session).
router.use('/chat', requireAuth, requireRole('patient'), chatRoutes);

// Hospital recommendations (patient-only; specialty comes from the assessment).
router.use('/hospitals', requireAuth, requireRole('patient'), hospitalRoutes);

router.use('/auth', authRoutes);

export default router;