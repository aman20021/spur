import Database from 'better-sqlite3';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { config } from '../config.js';

export function migrate() {
  const dbDir = resolve(config.databasePath, '..');
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  const db = new Database(config.databasePath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS faq_knowledge (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    );
  `);

  console.log('[db] Migration complete');
  db.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}
