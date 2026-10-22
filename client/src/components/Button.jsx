import { cn } from './cn.js';

const VARIANTS = {
  primary: 'bg-accent text-bg hover:brightness-110 font-medium',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-border',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-transparent text-urgent border border-urgent/40 hover:bg-urgent/10',
};

const SIZES = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-base',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-control',
        'transition-colors duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
