import { cn } from './cn.js';

// Empty states use the display serif — they are the one place a quiet
// interface gets to say something.
export function EmptyState({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <h2 className="font-display text-lg text-text">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-base text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
