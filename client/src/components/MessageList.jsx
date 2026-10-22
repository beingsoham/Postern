import { PriorityBadge } from './PriorityBadge.jsx';
import { DemoBadge } from './DemoBadge.jsx';
import { Skeleton } from './Skeleton.jsx';
import { cn } from './cn.js';
import { relativeTime } from '../lib/time.js';

function Row({ email, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(email.id)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'w-full border-b border-border px-4 py-3 text-left',
        'transition-colors duration-150 ease-out',
        selected ? 'bg-surface-2' : 'hover:bg-surface-2/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-base',
            email.is_read ? 'text-muted' : 'text-text',
          )}
        >
          {email.subject || '(no subject)'}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted">
          {relativeTime(email.received_at)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        {email.priority ? (
          <PriorityBadge priority={email.priority} />
        ) : (
          <span className="font-mono text-xs text-muted">unanalyzed</span>
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
          {email.sender_name ?? email.sender}
        </span>
        {Boolean(email.is_demo) && <DemoBadge />}
      </div>
    </button>
  );
}

export function MessageList({ emails, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!emails.length) {
    return <p className="px-4 py-10 text-center text-base text-muted">No messages match.</p>;
  }

  return (
    <div>
      {emails.map((email) => (
        <Row
          key={email.id}
          email={email}
          selected={email.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
