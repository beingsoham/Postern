import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, EmptyState, SkeletonText } from '../components/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { dueLabel, isOverdue } from '../lib/time.js';

// The three sections answer different questions, so they are weighted
// differently rather than rendered as three identical boxes.
const SECTIONS = [
  {
    key: 'needs_attention',
    idKey: 'email_id',
    title: 'Needs attention',
    blurb: 'Ranked urgent or important',
    accent: 'border-l-urgent',
    to: (i) => `/inbox?focus=${i.email_id}`,
  },
  {
    key: 'reply_needed',
    idKey: 'email_id',
    title: 'Reply needed',
    blurb: 'Someone is waiting on you',
    accent: 'border-l-important',
    to: (i) => `/inbox?focus=${i.email_id}`,
  },
  {
    key: 'action_items',
    idKey: 'task_id',
    title: 'Action items',
    blurb: 'Due in the next three days',
    accent: 'border-l-normal',
    to: () => '/tasks',
  },
];

function Section({ section, items }) {
  const count = items?.length ?? 0;

  return (
    <Card className={`animate-fade-up border-l-2 ${section.accent}`}>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-sans text-md font-medium text-text">{section.title}</h2>
          <span className="font-mono text-xs text-muted">{count}</span>
        </div>
        <span className="text-xs text-muted">{section.blurb}</span>
      </div>

      {count === 0 ? (
        <p className="px-4 pt-1 pb-4 text-base text-muted">Nothing here.</p>
      ) : (
        <ul className="pb-1.5">
          {items.map((item) => (
            <li key={item[section.idKey]}>
              <Link
                to={section.to(item)}
                className="group flex items-start gap-3 px-4 py-2
                           transition-colors duration-150 ease-out hover:bg-surface-2"
              >
                <span
                  className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-border
                             transition-colors group-hover:bg-accent"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-base text-text">{item.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Briefing() {
  const { data, error, loading, reload } = useAsync(() => api.briefing(), []);
  const tasks = useAsync(() => api.tasks({ status: 'open' }), []);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(null);

  const briefing = data?.briefing;

  async function analyzeInbox() {
    setAnalyzing(true);
    setProgress('Reading your inbox locally. This takes about a minute.');
    try {
      const result = await api.analyzeAll({ limit: 40 });
      setProgress(
        `Analyzed ${result.analyzed} messages` +
          (result.fallbacks ? `, ${result.fallbacks} used rules only` : ''),
      );
      reload();
      tasks.reload();
    } catch (err) {
      setProgress(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const overdue = (tasks.data?.tasks ?? []).filter((t) => isOverdue(t.due_date));
  const empty =
    briefing &&
    !briefing.needs_attention.length &&
    !briefing.reply_needed.length &&
    !briefing.action_items.length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <header className="mb-8 flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          {loading ? (
            <SkeletonText lines={2} className="max-w-lg" />
          ) : (
            <>
              <h1 className="font-display text-display leading-[1.05] text-balance">
                {briefing?.headline ?? 'Your briefing'}
              </h1>
              {briefing?.next_step && (
                <p className="mt-3 max-w-xl text-md text-muted">{briefing.next_step}</p>
              )}
            </>
          )}
        </div>

        <Button
          variant="primary"
          onClick={analyzeInbox}
          disabled={analyzing}
          className="shrink-0"
        >
          {analyzing ? 'Analyzing…' : 'Analyze inbox'}
        </Button>
      </header>

      {progress && (
        <p className="mb-6 flex items-center gap-2 font-mono text-xs text-muted">
          {analyzing && (
            <span
              className="size-1.5 animate-pulse rounded-full bg-accent"
              aria-hidden="true"
            />
          )}
          {progress}
        </p>
      )}

      {error && (
        <Card className="mb-6 border-l-2 border-l-urgent">
          <div className="p-4">
            <p className="text-base text-urgent">The backend is not reachable.</p>
            <p className="mt-1 text-base text-muted">{error.message}</p>
          </div>
        </Card>
      )}

      {briefing?.source === 'rules' && !loading && !empty && (
        <Card className="mb-6 border-l-2 border-l-accent">
          <div className="p-4">
            <p className="text-base text-accent">Built from rules</p>
            <p className="mt-1 text-base text-muted">
              The local model was unavailable or its answer failed validation, so this briefing
              was assembled deterministically from stored facts.
            </p>
          </div>
        </Card>
      )}

      {overdue.length > 0 && !loading && (
        <Link
          to="/tasks"
          className="mb-6 flex items-center gap-2.5 rounded-card border border-urgent/30
                     bg-urgent/5 px-4 py-2.5 transition-colors hover:bg-urgent/10"
        >
          <span className="size-1.5 rounded-full bg-urgent" aria-hidden="true" />
          <span className="text-base text-text">
            {overdue.length} overdue {overdue.length === 1 ? 'task' : 'tasks'}
          </span>
          <span className="ml-auto font-mono text-xs text-muted">
            oldest {dueLabel(overdue[overdue.length - 1]?.due_date)}
          </span>
        </Link>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <div className="p-4">
                <SkeletonText lines={3} />
              </div>
            </Card>
          ))}
        </div>
      ) : empty || !briefing ? (
        <Card>
          <EmptyState
            title="Nothing needs you right now"
            description="Analyze the inbox and whatever deserves your attention will collect here."
            action={
              <Button variant="primary" onClick={analyzeInbox} disabled={analyzing}>
                Analyze inbox
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <Section key={section.key} section={section} items={briefing[section.key]} />
          ))}
        </div>
      )}
    </div>
  );
}
