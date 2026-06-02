import 'dotenv/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  databasePath: resolve(process.env.DATABASE_PATH || resolve(__dirname, '../data/chat.db')),
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '2000', 10),
  maxHistoryMessages: parseInt(process.env.MAX_HISTORY_MESSAGES || '20', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
