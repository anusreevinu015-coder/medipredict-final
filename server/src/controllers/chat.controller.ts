import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { createChatMessage, listMessagesByUser } from '../models/chat.model.js';
import { listConfirmedReports } from '../models/report.model.js';
import { assistant } from '../services/assistant.js';

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Please enter a message.').max(2000, 'Message is too long.'),
});

export const getMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const messages = await listMessagesByUser(req.user!.id);
  res.status(200).json({ messages });
});

export const generateAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const conversation = await listMessagesByUser(userId);
  const confirmedReports = await listConfirmedReports(userId);

  if (!conversation.some((m) => m.role === 'patient')) {
    res.status(400).json({ message: 'Describe your symptoms in the chat first, then I can prepare an assessment.' });
    return;
  }

  const result = await assistant.assess({
    patientName: req.user!.name,
    recentMessages: conversation,
    confirmedReports,
  });

  let messages = conversation;
  if (result.ready) {
    await createChatMessage({ userId, role: 'assistant', content: result.content });
    messages = await listMessagesByUser(userId);
  }

  res.status(200).json({
    messages,
    ready: result.ready,
    emergency: result.emergency,
    assessment: result.assessment,
    message: result.ready ? undefined : result.content,
  });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const userId = req.user!.id;
  const content = parsed.data.content;

  await createChatMessage({ userId, role: 'patient', content });
  const recentMessages = await listMessagesByUser(userId);
  const confirmedReports = await listConfirmedReports(userId);

  const reply = await assistant.reply({
    userMessage: content,
    patientName: req.user!.name,
    recentMessages,
    confirmedReports,
  });

  await createChatMessage({
    userId,
    role: 'assistant',
    content: reply.content,
  });

  const fullHistory = await listMessagesByUser(userId);
  res.status(200).json({ messages: fullHistory, emergency: reply.emergency });
});