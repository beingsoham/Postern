// Every statement here is parameterised. No string interpolation into SQL,
// ever — email text is untrusted input.

const nowIso = () => new Date().toISOString();

// Idempotent by provider_id: syncing the same message twice must not
// create a second row, and must not clobber local read state.
export function upsertEmail(db, email) {
  const stmt = db.prepare(`
    INSERT INTO emails
      (provider_id, thread_id, sender, sender_name, subject, body,
       received_at, direction, is_read, is_demo, list_unsubscribe)
    VALUES
      (@provider_id, @thread_id, @sender, @sender_name, @subject, @body,
       @received_at, @direction, @is_read, @is_demo, @list_unsubscribe)
    ON CONFLICT (provider_id) DO UPDATE SET
      subject     = excluded.subject,
      body        = excluded.body,
      received_at = excluded.received_at,
      thread_id   = excluded.thread_id
    RETURNING id
  `);

  return stmt.get({
    sender_name: null,
    is_read: 0,
    is_demo: 0,
    list_unsubscribe: 0,
    ...email,
  }).id;
}

export function getEmailById(db, id) {
  return db
    .prepare(
      `SELECT e.*, c.category, c.priority, c.reason, c.status AS analysis_status,
              c.model, c.requires_reply, c.user_override
       FROM emails e
       LEFT JOIN classifications c ON c.email_id = e.id
       WHERE e.id = ?`,
    )
    .get(id);
}

export function getThread(db, threadId, limit = 5) {
  return db
    .prepare(
      `SELECT id, sender, sender_name, subject, body, received_at, direction
       FROM emails WHERE thread_id = ?
       ORDER BY received_at ASC LIMIT ?`,
    )
    .all(threadId, limit);
}

// Re-analysis replaces derived data rather than appending to it, so running
// the pipeline twice cannot duplicate tasks.
export function saveAnalysis(db, emailId, { classification, actionItems }) {
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO classifications
         (email_id, category, priority, score, reason, requires_reply,
          model, status, created_at)
       VALUES (@email_id, @category, @priority, @score, @reason,
               @requires_reply, @model, @status, @created_at)
       ON CONFLICT (email_id) DO UPDATE SET
         -- A correction is about the priority, nothing else. Freezing the
         -- whole row left the model name and reason stale forever, so a
         -- corrected email went on reporting whichever model first saw it.
         priority = CASE
           WHEN classifications.user_override = 1 THEN classifications.priority
           ELSE excluded.priority
         END,
         reason = CASE
           WHEN classifications.user_override = 1 THEN 'You set this priority.'
           ELSE excluded.reason
         END,
         category = excluded.category,
         score = excluded.score,
         requires_reply = excluded.requires_reply,
         model = excluded.model,
         status = excluded.status,
         created_at = excluded.created_at`,
    ).run({ email_id: emailId, created_at: nowIso(), ...classification });

    // Only machine-made rows are cleared; anything the user touched stays.
    db.prepare(
      `DELETE FROM action_items
       WHERE email_id = ? AND status = 'open'`,
    ).run(emailId);

    const insert = db.prepare(
      `INSERT INTO action_items
         (email_id, description, due_date, verification, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const item of actionItems ?? []) {
      insert.run(
        emailId,
        item.description,
        item.due_date ?? null,
        item.verification ?? 'unverified',
        nowIso(),
      );
    }
  });

  tx();
}

export function setPriorityOverride(db, emailId, priority) {
  return db
    .prepare(
      `UPDATE classifications
       SET priority = ?, user_override = 1, reason = 'You set this priority.'
       WHERE email_id = ?`,
    )
    .run(priority, emailId);
}

export function getSetting(db, key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

export function setSetting(db, key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(key, String(value));
}
