PRAGMA foreign_keys = ON;

-- Source email. Bodies live here and nowhere else; derived data references
-- this table and cascades on delete so "delete the email" really means it.
CREATE TABLE IF NOT EXISTS emails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id  TEXT    NOT NULL UNIQUE,
  thread_id    TEXT    NOT NULL,
  sender       TEXT    NOT NULL,
  sender_name  TEXT,
  subject      TEXT    NOT NULL DEFAULT '',
  body         TEXT    NOT NULL DEFAULT '',
  received_at  TEXT    NOT NULL,
  direction    TEXT    NOT NULL CHECK (direction IN ('in', 'out')),
  is_read      INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  is_demo      INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  list_unsubscribe INTEGER NOT NULL DEFAULT 0 CHECK (list_unsubscribe IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_emails_thread    ON emails (thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_received  ON emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails (direction);

-- One row per email. Replaced wholesale on re-analysis.
CREATE TABLE IF NOT EXISTS classifications (
  email_id   INTEGER PRIMARY KEY REFERENCES emails (id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN
               ('academic','work','recruiting','finance','security','newsletter','social','other')),
  priority   TEXT NOT NULL CHECK (priority IN ('urgent','important','normal','low')),
  score      INTEGER NOT NULL DEFAULT 0,
  reason     TEXT NOT NULL DEFAULT '',
  requires_reply INTEGER NOT NULL DEFAULT 0 CHECK (requires_reply IN (0, 1)),
  model      TEXT,
  -- 'ok' when the model ran, 'fallback' when rules stood in for it.
  status     TEXT NOT NULL CHECK (status IN ('ok', 'fallback')),
  user_override INTEGER NOT NULL DEFAULT 0 CHECK (user_override IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classifications_priority ON classifications (priority);

-- Extracted actions. verification records whether we trust the due date.
CREATE TABLE IF NOT EXISTS action_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id     INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  description  TEXT    NOT NULL,
  due_date     TEXT,
  status       TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  verification TEXT    NOT NULL DEFAULT 'unverified'
                 CHECK (verification IN ('verified','unverified')),
  created_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_items_email  ON action_items (email_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items (status, due_date);

CREATE TABLE IF NOT EXISTS drafts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id   INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  tone       TEXT    NOT NULL CHECK (tone IN ('friendly','formal','brief')),
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_email ON drafts (email_id);

-- Outgoing mail nobody answered. Keyed by thread, not email.
CREATE TABLE IF NOT EXISTS follow_ups (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id      TEXT    NOT NULL UNIQUE,
  email_id       INTEGER REFERENCES emails (id) ON DELETE CASCADE,
  suggested_date TEXT,
  status         TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','followed_up','resolved','dismissed')),
  notes          TEXT,
  created_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
