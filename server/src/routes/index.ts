import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import chatRoutes from './chat.routes.js';
import hospitalRoutes from './hospital.routes.js';
import adminRoutes from './admin.routes.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', name: 'Medipredict API' });
});

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