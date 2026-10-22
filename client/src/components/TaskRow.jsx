import { cn } from './cn.js';

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
        <p className="font-mono text-xs text-muted">
          {task.due_date ? `due ${task.due_date}` : 'no date'}
          {task.verification === 'unverified' && ' · unverified'}
        </p>
      </div>
    </li>
  );
}
