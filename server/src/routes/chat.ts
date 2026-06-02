import { Router } from 'express';
import db from '../db/index.js';
import { validateBody, chatMessageSchema } from '../middleware/validate.js';
import {
  createConversation,
  getConversation,
  addMessage,
  getMessages,
  getRecentHistory,
} from '../services/conversation.js';
import { generateReply } from '../services/llm.js';
import { config } from '../config.js';

const router = Router();

router.post('/message', validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { message, sessionId } = req.body as { message: string; sessionId?: string };

    let conversation;
    if (sessionId) {
      conversation = getConversation(sessionId);
      if (!conversation) {
        conversation = createConversation();
      }
    } else {
      conversation = createConversation();
    }

    addMessage(conversation.id, 'user', message);

    const history = getRecentHistory(conversation.id, config.maxHistoryMessages);
    // Remove the last message (the one we just added) from history passed to LLM
    const historyForLLM = history.slice(0, -1);

    const reply = await generateReply(historyForLLM, message);

    addMessage(conversation.id, 'ai', reply);

    res.json({
      reply,
      sessionId: conversation.id,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[chat] Error:', err.message);

    if (err.message.includes('rate_limit') || err.message.includes('429')) {
      res.status(429).json({
        reply: "I'm getting a lot of messages right now. Please wait a moment and try again! 🙏",
        error: 'rate_limit',
      });
      return;
    }

    if (err.message.includes('authentication') || err.message.includes('401')) {
      res.status(500).json({
        reply: "I'm having trouble connecting to my brain right now. Our team has been notified! 🔧",
        error: 'auth_error',
      });
      return;
    }

    res.status(500).json({
      reply: "Sorry, I ran into an issue processing your message. Please try again in a moment. If this persists, reach out to support@sparkstore.in 📧",
      error: 'internal_error',
    });
  }
});

router.get('/conversations', (_req, res) => {
  const conversations = db.prepare(`
    SELECT c.id, c.created_at,
      (SELECT text FROM messages WHERE conversation_id = c.id AND sender = 'user' ORDER BY created_at ASC LIMIT 1) as preview,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    WHERE (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) > 0
    ORDER BY c.created_at DESC
    LIMIT 50
  `).all();

  res.json({ conversations });
});

router.delete('/conversations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(sessionId);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(sessionId);
  res.json({ success: true });
});

router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const conversation = getConversation(sessionId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const messages = getMessages(sessionId);

  res.json({
    sessionId: conversation.id,
    createdAt: conversation.created_at,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      createdAt: m.created_at,
    })),
  });
});

export default router;
