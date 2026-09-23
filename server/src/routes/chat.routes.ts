import { Router } from 'express';
import {
  generateAssessment,
  getMessages,
  sendMessage,
} from '../controllers/chat.controller.js';

const router = Router();

router.get('/messages', getMessages);
router.post('/messages', sendMessage);
router.post('/assessment', generateAssessment);

export default router;