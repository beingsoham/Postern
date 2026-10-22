// Central place for every environment-backed setting.
// Nothing here is a secret; secrets stay in .env and are never logged.

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
  ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen3:4b',
  dbPath: process.env.DB_PATH ?? './data/postern.db',
  isTest: process.env.NODE_ENV === 'test',
};
