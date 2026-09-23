import { Router } from 'express';
import {
  getHospitalCatalog,
  getRecommendations,
} from '../controllers/hospital.controller.js';

const router = Router();

// The specialty always comes from the assessment; patient identity comes from
// the authenticated session, never from the client.
router.get('/recommendations', getRecommendations);

// Full hospital catalog (hospitals, departments and doctors) used by the
// appointment booking flow.
router.get('/catalog', getHospitalCatalog);

export default router;