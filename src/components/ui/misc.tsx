import * as T from '@radix-ui/react-tooltip';
import { Check, Minus } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/status';

/* ------------------------------------------------------------- tooltip */

export function Tip({ label, children, side = 'bottom', shortcut }: { label: ReactNode; children: ReactElement; side?: 'top' | 'bottom' | 'left' | 'right'; shortcut?: string }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="animate-fade-in z-[60] flex items-center gap-2 rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-xs text-fg shadow-lg shadow-black/20"
        >
          {label}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export const TooltipProvider = T.Provider;

/* --------------------------------------------------------------- input */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full rounded-md border border-line bg-surface-1 px-2.5 text-[13px] text-fg placeholder:text-subtle',
        'transition-colors outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 focus-visible:outline-none',
        'disabled:opacity-50',
        className,
      )}
      {...p}
    />
  );
});

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-subtle">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------ checkbox */

export function Checkbox({
  checked,
  onChange,
  className,
  label,
  disabled,
}: {
  checked: boolean | 'mixed';
  onChange: (next: boolean) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}) {
  const on = checked === true;
  const mixed = checked === 'mixed';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        on || mixed ? 'border-sky-500 bg-sky-500 text-white' : 'border-line-strong bg-surface-1 hover:border-subtle',
        'disabled:opacity-40',
        className,
      )}
    >
      {on && <Check className="size-3" strokeWidth={3} />}
      {mixed && <Minus className="size-3" strokeWidth={3} />}
    </button>
  );
}

/* -------------------------------------------------------------- switch */

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors disabled:opacity-40',
        checked ? 'border-sky-500 bg-sky-500' : 'border-line-strong bg-surface-3',
      )}
    >
      <span className={cn('block size-3 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[15px]' : 'translate-x-[2px]')} />
    </button>
  );
}

export function SwitchRow({ label, hint, checked, onChange }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div>
        <div className="text-[13px]">{label}</div>
        {hint && <div className="text-[11px] text-subtle">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={typeof label === 'string' ? label : undefined} />
    </div>
  );
}

/* --------------------------------------------------------------- pills */

const tones: Record<Tone, { pill: string; dot: string; bar: string }> = {
  emerald: { pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  sky: { pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  amber: { pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  zinc: { pill: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/20', dot: 'bg-zinc-400', bar: 'bg-zinc-400 dark:bg-zinc-500' },
  rose: { pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/25', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  violet: { pill: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20', dot: 'bg-violet-500', bar: 'bg-violet-500' },
};

export const toneClass = tones;

export function Pill({ tone, children, className, pulse }: { tone: Tone; children: ReactNode; className?: string; pulse?: boolean }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset', tones[tone].pill, className)}>
      <span className={cn('size-1.5 rounded-full', tones[tone].dot, pulse && 'animate-pulse')} />
      {children}
    </span>
  );
}

export function Chip({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className={cn('inline-flex h-[18px] items-center rounded border border-line bg-surface-2 px-1.5 text-[10.5px] font-medium text-muted', onClick && 'cursor-pointer hover:text-fg', className)}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ progress */

export function ProgressBar({ value, tone, striped, className }: { value: number; tone: Tone; striped?: boolean; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tones[tone].bar, striped && 'progress-stripes')} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ----------------------------------------------------------------- kbd */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line-strong bg-surface-1 px-1 text-[10px] text-subtle', className)}>
      {children}
    </kbd>
  );
}
