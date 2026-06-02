import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { buildKnowledgeContext } from './knowledge.js';
import type { Message } from './conversation.js';

const client = new AnthropicBedrock({
  awsRegion: process.env.AWS_REGION || 'us-west-2',
  apiKey: process.env.AWS_BEARER_TOKEN_BEDROCK || '',
});

const SYSTEM_PROMPT = `You are a friendly and helpful customer support agent for SparkStore, a popular Indian e-commerce store selling electronics, fashion, and home & living products.

GUIDELINES:
- Be concise and helpful. Keep responses under 3 sentences unless more detail is needed.
- Use a warm, professional tone. You can use light emojis sparingly (✨, 📦, 💳).
- If you don't know something specific (like a particular order status), say so honestly and suggest contacting support via email/phone.
- Never make up information about orders, tracking numbers, or specific product availability.
- If a customer seems frustrated, acknowledge their frustration before helping.
- For questions outside store topics, politely redirect: "I'm SparkStore's support assistant — I can help with orders, shipping, returns, and products!"

${buildKnowledgeContext()}`;

export async function generateReply(
  history: Message[],
  userMessage: string
): Promise<string> {
  const messages: { role: 'user' | 'assistant'; content: string }[] = history.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));

  messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return text || 'I apologize, I was unable to process your request. Please try again.';
}
