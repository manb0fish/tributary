import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../i18n';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <D.Content
          className={cn(
            'animate-pop-in glass fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-xl border border-line-strong shadow-2xl shadow-black/30 outline-none',
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <D.Title className="text-[15px] font-semibold tracking-tight">{title}</D.Title>
              {description ? (
                <D.Description className="mt-0.5 text-xs text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === 'string' ? title : ''}</D.Description>
              )}
            </div>
            <D.Close className="-mr-1 rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg" aria-label={t('common.close')}>
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
