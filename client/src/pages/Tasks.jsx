import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, CardBody, CardHeader, EmptyState, SkeletonText } from '../components/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

// Grouped by when it is due, because that is the only ordering that helps.
function bucketOf(dueDate) {
  if (!dueDate) return 'No date';

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  if (dueDate < today) return 'Overdue';
  if (dueDate === today) return 'Today';
  if (dueDate === tomorrow) return 'Tomorrow';
  if (dueDate <= weekEnd) return 'This week';
  return 'Later';
}

const ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date'];

function TaskItem({ task, onChange }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const done = task.status === 'done';

  async function save() {
    await onChange(task.id, { description, due_date: dueDate || null });
    setEditing(false);
  }

  return (
    <li className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onChange(task.id, { status: done ? 'open' : 'done' })}
          className="mt-1 size-3.5 shrink-0 accent-accent"
          aria-label={`Mark "${task.description}" ${done ? 'not done' : 'done'}`}
        />

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-control border border-border bg-bg px-2 py-1 text-base"
                aria-label="Task description"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-control border border-border bg-bg px-2 py-1 font-mono text-xs"
                  aria-label="Due date"
                />
                <Button size="sm" variant="primary" onClick={save}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className={done ? 'text-base text-muted line-through' : 'text-base'}>
                {task.description}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted">
                {task.due_date ? `due ${task.due_date}` : 'no date'}
                {task.verification === 'unverified' && ' · unverified'}
                {task.email_subject && ' · '}
                {task.email_subject && (
                  <Link to={`/inbox?focus=${task.email_id}`} className="hover:text-text">
                    {task.email_subject}
                  </Link>
                )}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange(task.id, { status: 'dismissed' })}
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function Tasks() {
  const [showDismissed, setShowDismissed] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api.tasks(), []);

  async function change(id, patch) {
    await api.updateTask(id, patch);
    reload();
  }

  const tasks = (data?.tasks ?? []).filter(
    (t) => showDismissed || t.status !== 'dismissed',
  );

  const groups = ORDER
    .map((name) => [name, tasks.filter((t) => bucketOf(t.due_date) === name)])
    .filter(([, items]) => items.length);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl">Tasks</h1>
          <p className="mt-1 text-base text-muted">
            Extracted from your mail. A date marked unverified was not confirmed
            against the email text.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowDismissed((v) => !v)}>
          {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
        </Button>
      </div>

      {error && <p className="mb-4 text-base text-urgent">{error.message}</p>}

      {loading ? (
        <Card><CardBody><SkeletonText lines={6} /></CardBody></Card>
      ) : !groups.length ? (
        <Card>
          <EmptyState
            title="No tasks yet"
            description="Analyze the inbox and anything you need to do will collect here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([name, items]) => (
            <Card key={name}>
              <CardHeader title={`${name} · ${items.length}`} />
              <ul>
                {items.map((task) => (
                  <TaskItem key={task.id} task={task} onChange={change} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
