/**
 * Shared styling for Radix ContextMenu + DropdownMenu so both feel identical.
 */
import * as CM from '@radix-ui/react-context-menu';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

const content =
  'glass z-50 min-w-[200px] overflow-hidden rounded-lg border border-line-strong p-1 text-[13px] shadow-xl shadow-black/25 animate-pop-in';
const item =
  'relative flex h-7 cursor-default items-center gap-2 rounded-md px-2 outline-none select-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-fg data-[disabled]:opacity-40 data-[disabled]:pointer-events-none [&_svg]:size-3.5 [&_svg]:text-muted';
const danger = 'text-rose-500 dark:text-rose-400 [&_svg]:!text-current data-[highlighted]:bg-rose-500/10';

interface ItemExtras {
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
}

function ItemInner({ icon, shortcut, children }: { icon?: ReactNode; shortcut?: string; children: ReactNode }) {
  return (
    <>
      <span className="flex w-4 justify-center">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="num ml-4 text-[11px] text-subtle">{shortcut}</span>}
    </>
  );
}

/* ----------------------------------------------------------- context */

export const ContextMenu = CM.Root;
export const ContextMenuTrigger = CM.Trigger;

export function ContextMenuContent({ className, ...p }: ComponentPropsWithoutRef<typeof CM.Content>) {
  return (
    <CM.Portal>
      <CM.Content className={cn(content, className)} {...p} />
    </CM.Portal>
  );
}

export function ContextMenuItem({ icon, shortcut, destructive, className, children, ...p }: ComponentPropsWithoutRef<typeof CM.Item> & ItemExtras) {
  return (
    <CM.Item className={cn(item, destructive && danger, className)} {...p}>
      <ItemInner icon={icon} shortcut={shortcut}>
        {children}
      </ItemInner>
    </CM.Item>
  );
}

export function ContextMenuSeparator() {
  return <CM.Separator className="-mx-1 my-1 h-px bg-line" />;
}

export function ContextMenuLabel({ children }: { children: ReactNode }) {
  return <CM.Label className="truncate px-2 pt-1 pb-1.5 text-[11px] font-medium text-subtle">{children}</CM.Label>;
}

export function ContextMenuSub({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <CM.Sub>
      <CM.SubTrigger className={cn(item, 'data-[state=open]:bg-accent-soft')}>
        <ItemInner icon={icon}>{label}</ItemInner>
        <ChevronRight className="ml-auto" />
      </CM.SubTrigger>
      <CM.Portal>
        <CM.SubContent className={content} sideOffset={4}>
          {children}
        </CM.SubContent>
      </CM.Portal>
    </CM.Sub>
  );
}

/* ---------------------------------------------------------- dropdown */

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...p }: ComponentPropsWithoutRef<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content sideOffset={sideOffset} className={cn(content, className)} {...p} />
    </DM.Portal>
  );
}

export function DropdownMenuItem({ icon, shortcut, destructive, className, children, ...p }: ComponentPropsWithoutRef<typeof DM.Item> & ItemExtras) {
  return (
    <DM.Item className={cn(item, destructive && danger, className)} {...p}>
      <ItemInner icon={icon} shortcut={shortcut}>
        {children}
      </ItemInner>
    </DM.Item>
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...p }: ComponentPropsWithoutRef<typeof DM.CheckboxItem>) {
  return (
    <DM.CheckboxItem className={cn(item, className)} onSelect={(e) => e.preventDefault()} {...p}>
      <span className="flex w-4 justify-center">
        <DM.ItemIndicator>
          <Check className="!text-accent" />
        </DM.ItemIndicator>
      </span>
      <span className="flex-1 truncate">{children}</span>
    </DM.CheckboxItem>
  );
}

export function DropdownMenuRadioGroup(p: ComponentPropsWithoutRef<typeof DM.RadioGroup>) {
  return <DM.RadioGroup {...p} />;
}

export function DropdownMenuRadioItem({ className, children, ...p }: ComponentPropsWithoutRef<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem className={cn(item, className)} {...p}>
      <span className="flex w-4 justify-center">
        <DM.ItemIndicator>
          <span className="block size-1.5 rounded-full bg-accent" />
        </DM.ItemIndicator>
      </span>
      <span className="flex-1 truncate">{children}</span>
    </DM.RadioItem>
  );
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="-mx-1 my-1 h-px bg-line" />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-subtle">{children}</DM.Label>;
}

export function DropdownMenuSub({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <DM.Sub>
      <DM.SubTrigger className={cn(item, 'data-[state=open]:bg-accent-soft')}>
        <ItemInner icon={icon}>{label}</ItemInner>
        <ChevronRight className="ml-auto" />
      </DM.SubTrigger>
      <DM.Portal>
        <DM.SubContent className={content} sideOffset={4}>
          {children}
        </DM.SubContent>
      </DM.Portal>
    </DM.Sub>
  );
}
