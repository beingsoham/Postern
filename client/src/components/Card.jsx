import { cn } from './cn.js';

// 1px border, 12px radius, no shadow. The border does the separating work.
export function Card({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag
      className={cn('rounded-card border border-border bg-surface', className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, action, className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border px-4 py-3',
        className,
      )}
    >
      <h3 className="font-sans text-sm font-medium tracking-wide text-muted uppercase">
        {title}
      </h3>
      {action}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}
