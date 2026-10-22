import { cn } from './cn.js';

// Priority colours are ALWAYS paired with a text label, never colour alone.
// That is an accessibility requirement from the specification, not a style.
const LEVELS = {
  urgent: { label: 'Urgent', dot: 'bg-urgent', text: 'text-urgent', ring: 'border-urgent/30' },
  important: {
    label: 'Important',
    dot: 'bg-important',
    text: 'text-important',
    ring: 'border-important/30',
  },
  normal: { label: 'Normal', dot: 'bg-normal', text: 'text-normal', ring: 'border-normal/30' },
  low: { label: 'Low', dot: 'bg-low', text: 'text-low', ring: 'border-low/40' },
};

export function PriorityBadge({ priority = 'normal', className }) {
  const level = LEVELS[priority] ?? LEVELS.normal;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-xs whitespace-nowrap',
        level.ring,
        level.text,
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', level.dot)} aria-hidden="true" />
      {level.label}
    </span>
  );
}
