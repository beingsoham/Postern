// Central place for every environment-backed setting.
// Nothing here is a secret; secrets stay in .env and are never logged.

import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The repository root, two levels above server/src.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// A relative DB_PATH must mean the same file wherever the process starts
// from, so resolve it against the project root rather than the cwd.
const resolveFromRoot = (value) =>
  value === ':memory:' || isAbsolute(value) ? value : resolve(projectRoot, value);

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  // Body limit keeps a hostile request from exhausting memory.
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '1mb',
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen3:1.7b',
  projectRoot,
  dbPath: resolveFromRoot(process.env.DB_PATH ?? './data/postern.db'),
  isTest: process.env.NODE_ENV === 'test',
};
