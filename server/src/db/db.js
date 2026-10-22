import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../config.js';

const here = dirname(fileURLToPath(import.meta.url));

let instance = null;

// Opens the database and applies the schema. Safe to call repeatedly:
// every statement in schema.sql is CREATE ... IF NOT EXISTS.
export function openDb(path = config.dbPath) {
  const file = path === ':memory:' ? path : resolve(path);

  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true });
  }

  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(resolve(here, 'schema.sql'), 'utf8'));

  return db;
}

// Shared connection for the running server.
export function getDb() {
  if (!instance) instance = openDb();
  return instance;
}

export function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}
