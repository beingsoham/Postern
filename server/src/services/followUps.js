/**
 * An outgoing message with no later incoming message in the same thread,
 * older than the configured window, is a candidate follow-up.
 * This is pure SQL: no model is involved and none is needed.
 */
export function detectFollowUps(db, { days = 3, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();

  const candidates = db
    .prepare(
      `SELECT sent.id, sent.thread_id, sent.subject, sent.received_at
       FROM emails sent
       WHERE sent.direction = 'out'
         AND sent.received_at <= @cutoff
         AND NOT EXISTS (
           SELECT 1 FROM emails reply
           WHERE reply.thread_id = sent.thread_id
             AND reply.direction = 'in'
             AND reply.received_at > sent.received_at
         )
       ORDER BY sent.received_at ASC`,
    )
    .all({ cutoff });

  const insert = db.prepare(
    `INSERT INTO follow_ups (thread_id, email_id, suggested_date, status, notes, created_at)
     VALUES (@thread_id, @email_id, @suggested_date, 'pending', @notes, @created_at)
     ON CONFLICT (thread_id) DO NOTHING`,
  );

  const tx = db.transaction(() => {
    for (const c of candidates) {
      const waited = Math.floor(
        (now.getTime() - new Date(c.received_at).getTime()) / 86_400_000,
      );
      insert.run({
        thread_id: c.thread_id,
        email_id: c.id,
        suggested_date: new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10),
        notes: `No reply for ${waited} days.`,
        created_at: now.toISOString(),
      });
    }
  });
  tx();

  return candidates.length;
}
