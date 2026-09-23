import { Router } from 'express';
import { getDashboard } from '../controllers/admin.controller.js';
import {
  listAllAppointmentsAdmin,
  setAppointmentStatus,
} from '../controllers/appointment.controller.js';
import {
  listAllFeedbackAdmin,
  removeFeedback,
} from '../controllers/feedback.controller.js';
import {
  addDepartment,
  addDoctor,
  addHospital,
  editDepartment,
  editDoctor,
  editHospital,
  listHospitalsAdmin,
  removeDepartment,
  removeDoctor,
  removeHospital,
} from '../controllers/hospital-admin.controller.js';
import { getPatientDetail, listPatients } from '../controllers/admin-patient.controller.js';

const router = Router();

// Admin-only operations. The whole router is behind requireAuth +
// requireRole('admin') mounted in routes/index.ts.

// Dashboard statistics, trends and recent activity (real database data).
router.get('/dashboard', getDashboard);

// Patients (all registered patients, plus a full detail view).
router.get('/patients', listPatients);
router.get('/patients/:id', getPatientDetail);

// Appointments
router.get('/appointments', listAllAppointmentsAdmin);
router.patch('/appointments/:id/status', setAppointmentStatus);

// Feedback
router.get('/feedback', listAllFeedbackAdmin);
router.delete('/feedback/:id', removeFeedback);

// Hospital & doctor management
router.get('/hospitals', listHospitalsAdmin);
router.post('/hospitals', addHospital);
router.put('/hospitals/:id', editHospital);
router.delete('/hospitals/:id', removeHospital);

router.post('/hospitals/:id/departments', addDepartment);
router.put('/hospitals/:id/departments/:departmentId', editDepartment);
router.delete('/hospitals/:id/departments/:departmentId', removeDepartment);

router.post('/hospitals/:id/doctors', addDoctor);
router.put('/hospitals/:id/doctors/:doctorId', editDoctor);
router.delete('/hospitals/:id/doctors/:doctorId', removeDoctor);

export default router;