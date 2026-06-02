import { nanoid } from 'nanoid';
import db from '../db/index.js';

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  metadata?: string;
}

export function createConversation(): Conversation {
  const id = nanoid(12);
  const stmt = db.prepare('INSERT INTO conversations (id) VALUES (?)');
  stmt.run(id);

  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation;
}

export function getConversation(id: string): Conversation | null {
  return (db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation) || null;
}

export function addMessage(conversationId: string, sender: 'user' | 'ai', text: string): Message {
  const id = nanoid(12);
  const stmt = db.prepare(
    'INSERT INTO messages (id, conversation_id, sender, text) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, conversationId, sender, text);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message;
}

export function getMessages(conversationId: string, limit?: number): Message[] {
  const sql = limit
    ? 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?'
    : 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC';

  return limit
    ? (db.prepare(sql).all(conversationId, limit) as Message[])
    : (db.prepare(sql).all(conversationId) as Message[]);
}

export function getRecentHistory(conversationId: string, maxMessages: number): Message[] {
  const sql = `
    SELECT * FROM (
      SELECT * FROM messages WHERE conversation_id = ?
      ORDER BY created_at DESC LIMIT ?
    ) ORDER BY created_at ASC
  `;
  return db.prepare(sql).all(conversationId, maxMessages) as Message[];
}
