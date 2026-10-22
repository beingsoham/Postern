import { useState } from 'react';

import { Button } from './Button.jsx';
import { DemoBadge } from './DemoBadge.jsx';
import { DraftPanel } from './DraftPanel.jsx';
import { EmailBody } from './EmailBody.jsx';
import { EmptyState } from './EmptyState.jsx';
import { PriorityBadge } from './PriorityBadge.jsx';
import { ReasonChip } from './ReasonChip.jsx';
import { SkeletonText } from './Skeleton.jsx';
import { TaskRow } from './TaskRow.jsx';
import { absoluteTime } from '../lib/time.js';

const PRIORITIES = ['urgent', 'important', 'normal', 'low'];

export function Reader({
  detail,
  loading,
  analyzing,
  onAnalyze,
  onOverride,
  onToggleTask,
  draftOpen,
  setDraftOpen,
}) {
  const [correcting, setCorrecting] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <SkeletonText lines={2} />
        <SkeletonText lines={6} />
      </div>
    );
  }

  if (!detail) {
    return (
      <EmptyState
        title="Nothing selected"
        description="Pick a message from the list, or press j and k to move through it."
      />
    );
  }

  const { email, tasks } = detail;

  return (
    <div className="px-8 py-7">
      <header className="border-b border-border pb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl leading-tight">
            {email.subject || '(no subject)'}
          </h1>
          {Boolean(email.is_demo) && <DemoBadge className="mt-1 shrink-0" />}
        </div>
        <p className="mt-2 font-mono text-xs text-muted">
          {email.sender_name ? `${email.sender_name} · ` : ''}
          {email.sender}
          {' · '}
          {absoluteTime(email.received_at)}
        </p>
      </header>

      <div className="border-b border-border py-4">
        {email.priority ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={email.priority} />
              {email.analysis_status === 'fallback' && (
                <span className="font-mono text-xs text-accent">rules only</span>
              )}
              {Boolean(email.user_override) && (
                <span className="font-mono text-xs text-muted">your correction</span>
              )}
              {email.model && (
                <span className="ml-auto font-mono text-xs text-muted">{email.model}</span>
              )}
            </div>

            <ReasonChip
              className="mt-2"
              reason={email.reason || 'No reason recorded.'}
              onCorrect={() => setCorrecting((v) => !v)}
            />

            {correcting && (
              <div className="mt-2 flex flex-wrap gap-1">
                {PRIORITIES.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === email.priority ? 'primary' : 'secondary'}
                    onClick={() => {
                      onOverride(p);
                      setCorrecting(false);
                    }}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-base text-muted">This message has not been analyzed.</p>
            <Button size="sm" variant="primary" onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? 'Analyzing…' : 'Analyze'}
            </Button>
          </div>
        )}
      </div>

      {tasks?.length > 0 && (
        <section className="border-b border-border py-4">
          <h2 className="mb-2 font-mono text-xs tracking-widest text-muted uppercase">
            Extracted tasks
          </h2>
          <ul className="space-y-2">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={onToggleTask} />
            ))}
          </ul>
        </section>
      )}

      <section className="py-4">
        <EmailBody body={email.body} />
      </section>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={() => setDraftOpen(true)}>
          Draft reply
        </Button>
        <Button variant="ghost" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? 'Analyzing…' : 'Re-analyze'}
        </Button>
      </div>

      {draftOpen && <DraftPanel email={email} onClose={() => setDraftOpen(false)} />}
    </div>
  );
}
