import { cn } from './cn.js';

// Sample mail must be visibly different from real mail. Always.
export function DemoBadge({ className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-accent/40 bg-accent/10',
        'px-2 py-0.5 font-mono text-xs tracking-wide text-accent uppercase',
        className,
      )}
    >
      Demo
    </span>
  );
}
