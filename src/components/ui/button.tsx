import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-sky-500 text-white hover:bg-sky-400 active:bg-sky-600 shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] dark:bg-sky-500 dark:hover:bg-sky-400',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  outline: 'border border-line text-fg hover:bg-surface-2',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600 shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-2 rounded-md',
  icon: 'h-8 w-8 rounded-md',
  'icon-sm': 'h-7 w-7 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', active, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-active={active || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
        'data-[active]:bg-accent-soft data-[active]:text-accent',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
