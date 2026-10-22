import { openDb } from './db.js';

// openDb applies schema.sql, so migrating is just opening the database.
const db = openDb();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
  .all()
  .map((r) => r.name);
db.close();

console.log(`Database ready. Tables: ${tables.join(', ')}`);
