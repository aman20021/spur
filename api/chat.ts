import type { VercelRequest, VercelResponse } from '@vercel/node';

const BEDROCK_REGION = process.env.AWS_REGION || 'us-west-2';
const BEDROCK_TOKEN = process.env.AWS_BEARER_TOKEN_BEDROCK || '';
const MODEL_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0';

async function callClaude(system: string, messages: { role: string; content: string }[]): Promise<string> {
  const url = `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/invoke`;

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 300,
    system,
    messages,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEDROCK_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Bedrock ${resp.status}: ${errText.substring(0, 200)}`);
  }

  const data = await resp.json() as { content: { type: string; text: string }[] };
  return data.content?.[0]?.text || 'I apologize, I was unable to process your request.';
}

const FAQ_KNOWLEDGE = `STORE KNOWLEDGE BASE:

[SHIPPING]
Q: What are your shipping options?
A: We offer Standard Shipping (5-7 business days, free on orders over ₹999), Express Shipping (2-3 business days, ₹149), and Same-Day Delivery (available in Delhi NCR, Mumbai, Bangalore for ₹299). All orders include tracking.

Q: Do you ship internationally?
A: Yes! We ship to USA, UK, Canada, Australia, and UAE. International shipping takes 7-14 business days and costs ₹499-₹999 depending on weight. Free international shipping on orders over ₹4999.

[RETURNS]
Q: What is your return policy?
A: We offer a 30-day hassle-free return policy. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the return. Return shipping is free for defective items; otherwise ₹99 is deducted.

Q: How do I initiate a return?
A: Go to My Orders → select the order → click "Return Item". Choose your reason and schedule a pickup. Our delivery partner will collect it within 2 business days.

[PAYMENTS]
Q: What payment methods do you accept?
A: We accept all major credit/debit cards (Visa, Mastercard, RuPay), UPI (GPay, PhonePe, Paytm), Net Banking, Wallets, and Cash on Delivery (₹49 fee). EMI available on orders above ₹3000 via select banks.

Q: Is my payment information secure?
A: Absolutely. We use Razorpay for payment processing with 256-bit SSL encryption. We never store your card details on our servers. All transactions are PCI-DSS compliant.

[SUPPORT]
Q: What are your support hours?
A: Our support team is available Monday-Saturday, 9 AM to 9 PM IST. You can reach us via live chat (fastest, avg response 2 min), email at support@sparkstore.in (response within 4 hours), or phone at 1800-123-4567 (toll-free).

[PRODUCTS]
Q: Do you have a warranty?
A: Electronics come with a 1-year manufacturer warranty. Fashion items have a 6-month quality guarantee. Home & Living products have a 90-day guarantee.

Q: Are your products authentic?
A: Yes, 100% authentic. We source directly from brands or authorized distributors. If you receive anything you suspect is not genuine, we'll refund 200% of the purchase price.`;

const SYSTEM_PROMPT = `You are a friendly and helpful customer support agent for SparkStore, a popular Indian e-commerce store selling electronics, fashion, and home & living products.

GUIDELINES:
- Be concise and helpful. Keep responses under 3 sentences unless more detail is needed.
- Use a warm, professional tone. You can use light emojis sparingly.
- If you don't know something specific, say so honestly and suggest contacting support.
- Never make up information about orders, tracking numbers, or specific product availability.
- For questions outside store topics, politely redirect.

${FAQ_KNOWLEDGE}`;

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const conversations = new Map<string, Message[]>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 14);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlObj = new URL(req.url || '', 'http://localhost');
  let path = urlObj.pathname;

  if (path.startsWith('/api/chat')) {
    path = path.replace('/api/chat', '');
  } else if (path.startsWith('/chat')) {
    path = path.replace('/chat', '');
  }

  if ((path === '' || path === '/') && req.query.path) {
    path = typeof req.query.path === 'string' ? req.query.path : '';
  }

  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // POST /chat/message
  if (req.method === 'POST' && path === '/message') {
    try {
      const { message, sessionId } = req.body || {};

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }

      if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
      }

      const convId = sessionId || generateId();
      if (!conversations.has(convId)) {
        conversations.set(convId, []);
      }

      const history = conversations.get(convId)!;
      history.push({ sender: 'user', text: message.trim() });

      const claudeMessages = history.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const reply = await callClaude(SYSTEM_PROMPT, claudeMessages);
      history.push({ sender: 'ai', text: reply });

      if (history.length > 40) {
        conversations.set(convId, history.slice(-40));
      }

      return res.json({ reply, sessionId: convId });
    } catch (error) {
      const err = error as Error;
      console.error('[chat] Error:', err.message);
      return res.status(500).json({
        reply: "Sorry, I ran into an issue. Please try again in a moment.",
        error: 'internal_error',
      });
    }
  }

  // GET /chat/history/:sessionId
  if (req.method === 'GET' && path.startsWith('/history/')) {
    const sessionId = path.replace('/history/', '');
    const history = conversations.get(sessionId);
    if (!history) return res.status(404).json({ error: 'Conversation not found' });
    return res.json({
      sessionId,
      createdAt: new Date().toISOString(),
      messages: history.map((m, i) => ({ id: `${sessionId}-${i}`, sender: m.sender, text: m.text, createdAt: new Date().toISOString() })),
    });
  }

  // GET /chat/conversations
  if (req.method === 'GET' && (path === '/conversations' || path === '/')) {
    const convList = Array.from(conversations.entries())
      .filter(([_, msgs]) => msgs.length > 0)
      .map(([id, msgs]) => ({ id, created_at: new Date().toISOString(), preview: msgs.find((m) => m.sender === 'user')?.text || null, message_count: msgs.length }))
      .slice(0, 50);
    return res.json({ conversations: convList });
  }

  // DELETE /chat/conversations/:id
  if (req.method === 'DELETE' && path.startsWith('/conversations/')) {
    conversations.delete(path.replace('/conversations/', ''));
    return res.json({ success: true });
  }

  return res.status(404).json({ error: 'Not found' });
}
