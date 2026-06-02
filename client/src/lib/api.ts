const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  error?: string;
}

export interface ConversationPreview {
  id: string;
  created_at: string;
  preview: string | null;
  message_count: number;
}

export interface HistoryResponse {
  sessionId: string;
  createdAt: string;
  messages: ChatMessage[];
}

export async function sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  return res.json();
}

export async function getHistory(sessionId: string): Promise<HistoryResponse> {
  const res = await fetch(`${API_BASE}/chat/history/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to load history: ${res.status}`);
  return res.json();
}

export async function getConversations(): Promise<ConversationPreview[]> {
  const res = await fetch(`${API_BASE}/chat/conversations`);
  if (!res.ok) throw new Error('Failed to load conversations');
  const data = await res.json();
  return data.conversations;
}

export async function deleteConversation(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/chat/conversations/${sessionId}`, { method: 'DELETE' });
}
