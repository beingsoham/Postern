import { cn } from './cn.js';

// Sidebar indicator: green dot, model name, 'running locally'.
// When the model is unreachable this must say so plainly rather than hide it.
export function StatusPill({ model, reachable = false, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-control border border-border bg-surface-2 px-2.5 py-2',
        className,
      )}
    >
      <span
        className={cn('size-2 shrink-0 rounded-full', reachable ? 'bg-local-ai' : 'bg-urgent')}
        aria-hidden="true"
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-mono text-xs text-text">{model ?? 'no model'}</p>
        <p className="text-xs text-muted">{reachable ? 'running locally' : 'unavailable'}</p>
      </div>
    </div>
  );
}
