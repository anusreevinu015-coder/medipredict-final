import { pool } from '../config/database.js';
import type { ChatMessage, ChatRole } from '../types/auth.js';

interface ChatMessageRow {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: Date;
}

function toChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function listMessagesByUser(userId: string): Promise<ChatMessage[]> {
  const result = await pool.query<ChatMessageRow>(
    'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC, id ASC',
    [userId],
  );
  return result.rows.map(toChatMessage);
}

export async function createChatMessage(data: {
  userId: string;
  role: ChatRole;
  content: string;
}): Promise<ChatMessage> {
  const result = await pool.query<ChatMessageRow>(
    'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING *',
    [data.userId, data.role, data.content],
  );
  return toChatMessage(result.rows[0]);
}