import { Button } from './Button.jsx';
import { cn } from './cn.js';

// Every priority label carries a one-line reason the user can correct.
// Transparency is a product principle: no unexplained ranking.
export function ReasonChip({ reason, onCorrect, className }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-control border border-border bg-surface-2 px-2.5 py-1.5',
        className,
      )}
    >
      <p className="flex-1 text-xs text-muted">{reason}</p>
      {onCorrect && (
        <Button variant="ghost" size="sm" onClick={onCorrect} className="-my-0.5 shrink-0">
          Correct this
        </Button>
      )}
    </div>
  );
}
