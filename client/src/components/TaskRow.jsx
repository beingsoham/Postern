import { cn } from './cn.js';
import { dueLabel, isOverdue } from '../lib/time.js';

// An unverified date is shown as such rather than hidden: the user should
// know when a deadline was not confirmed against the email text.
export function TaskRow({ task, onToggle }) {
  const done = task.status === 'done';

  return (
    <li className="flex items-start gap-2.5">
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(task, done ? 'open' : 'done')}
        className="mt-1 size-3.5 shrink-0 accent-accent"
        aria-label={`Mark "${task.description}" ${done ? 'not done' : 'done'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-base', done && 'text-muted line-through')}>{task.description}</p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className={cn('font-mono', isOverdue(task.due_date) && !done && 'text-urgent')}>
            {task.due_date ? dueLabel(task.due_date) : 'no date'}
          </span>
          {task.verification === 'unverified' && (
            <span
              className="rounded border border-border px-1 font-mono text-[0.65rem]"
              title="This date was not confirmed against the email text"
            >
              unverified
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
