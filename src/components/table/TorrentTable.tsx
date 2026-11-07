import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Updater,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Inbox, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useTorrents } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { FILTERS, trackerDomain } from '../../lib/status';
import type { TorrentRow } from '../../lib/rpc/types';
import { useUi } from '../../store/ui';
import { ContextMenu, ContextMenuTrigger } from '../ui/menu';
import { Button } from '../ui/button';
import { columns, RIGHT_ALIGNED } from './columns';
import { TorrentContextMenu } from './TorrentContextMenu';
import { BatchBar } from './BatchBar';
import { useT } from '../../i18n';

const ROW_H = 34;

/** Visible row order, shared with global keyboard shortcuts. */
export const visibleOrder: { current: readonly number[] } = { current: [] };

function resolve<T>(u: Updater<T>, old: T): T {
  return typeof u === 'function' ? (u as (o: T) => T)(old) : u;
}

function useFilteredRows(all: TorrentRow[]): TorrentRow[] {
  const filter = useUi((s) => s.filter);
  const label = useUi((s) => s.label);
  const tracker = useUi((s) => s.tracker);
  const search = useUi((s) => s.search);

  return useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((t) => {
      if (!match(t)) return false;
      if (label && !t.labels.includes(label)) return false;
      if (tracker && !t.trackers.some((tr) => trackerDomain(tr.announce) === tracker)) return false;
      if (terms.length) {
        const hay = t.name.toLowerCase();
        for (const term of terms) {
          if (!hay.includes(term) && !t.hashString.startsWith(term) && !t.labels.some((l) => l.toLowerCase() === term)) return false;
        }
      }
      return true;
    });
  }, [all, filter, label, tracker, search]);
}

export function TorrentTable() {
  const { data, isPending, isError, error } = useTorrents();
  const all = data ?? [];
  const rows = useFilteredRows(all);

  const sorting = useUi((s) => s.sorting);
  const columnSizing = useUi((s) => s.columnSizing);
  const columnVisibility = useUi((s) => s.columnVisibility);
  const selected = useUi((s) => s.selected);
  const focused = useUi((s) => s.focused);
  const ui = useUi.getState();

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnSizing, columnVisibility },
    onSortingChange: (u) => ui.setSorting(resolve(u, useUi.getState().sorting)),
    onColumnSizingChange: (u) => ui.setColumnSizing(resolve(u, useUi.getState().columnSizing)),
    onColumnVisibilityChange: (u) => ui.setColumnVisibility(resolve(u, useUi.getState().columnVisibility)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => String(r.id),
    columnResizeMode: 'onChange',
    enableSortingRemoval: false,
    enableMultiSort: true,
  });

  const modelRows = table.getRowModel().rows;
  const order = useMemo(() => modelRows.map((r) => r.original.id), [modelRows]);
  visibleOrder.current = order;

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 16,
  });

  // Keep the keyboard-focused row in view.
  useEffect(() => {
    if (focused === null) return;
    const idx = order.indexOf(focused);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const headerGroup = table.getHeaderGroups()[0];
  const totalWidth = table.getTotalSize();
  const isFiltered = rows.length !== all.length;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ContextMenu modal={false}>
        <ContextMenuTrigger asChild>
          <div
            ref={scrollRef}
            className="relative min-h-0 flex-1 overflow-auto outline-none"
            onMouseDown={(e) => {
              // Click on empty space clears the selection.
              if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.empty) ui.clearSelection();
            }}
          >
            <div style={{ minWidth: totalWidth }} className="relative">
              {/* Header */}
              <div className="glass sticky top-0 z-10 flex h-8 border-b border-line text-[11.5px] font-medium text-muted select-none">
                {headerGroup?.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const right = RIGHT_ALIGNED.has(header.column.id);
                  return (
                    <div
                      key={header.id}
                      className={cn('group relative flex shrink-0 items-center px-3', right && 'justify-end', header.column.getCanSort() && 'cursor-pointer hover:text-fg')}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className={cn('flex items-center gap-1 truncate', sorted && 'text-fg')}>
                        {right && sorted && <SortIcon desc={sorted === 'desc'} />}
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {!right && sorted && <SortIcon desc={sorted === 'desc'} />}
                      </span>
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={() => header.column.resetSize()}
                        className={cn(
                          'absolute top-1.5 right-0 bottom-1.5 w-[5px] cursor-col-resize border-r border-line transition-colors',
                          'group-hover:border-line-strong hover:!border-accent',
                          header.column.getIsResizing() && '!border-accent',
                        )}
                      />
                    </div>
                  );
                })}
                <div className="flex-1" />
              </div>

              {/* Body */}
              <div style={{ height: virtualizer.getTotalSize() }} className="relative">
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = modelRows[vi.index]!;
                  const t = row.original;
                  const isSel = selected.has(t.id);
                  const isFocus = focused === t.id;
                  return (
                    <div
                      key={row.id}
                      role="row"
                      aria-selected={isSel}
                      className={cn(
                        'absolute inset-x-0 flex items-center border-b border-line/50 text-[13px] select-none',
                        isSel ? 'bg-accent-soft' : 'hover:bg-surface-2/70',
                        isFocus && 'shadow-[inset_2px_0_0_var(--accent)]',
                      )}
                      style={{ height: ROW_H, transform: `translateY(${vi.start}px)` }}
                      onMouseDown={(e) => {
                        if (e.shiftKey) e.preventDefault();
                      }}
                      onClick={(e) => ui.clickRow(t.id, { toggle: e.metaKey || e.ctrlKey, range: e.shiftKey }, order)}
                      onDoubleClick={() => ui.setInspectorOpen(true)}
                      onContextMenu={() => {
                        if (!useUi.getState().selected.has(t.id)) ui.clickRow(t.id, { toggle: false, range: false }, order);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <div
                          key={cell.id}
                          className={cn('flex h-full min-w-0 shrink-0 items-center overflow-hidden px-3 whitespace-nowrap', RIGHT_ALIGNED.has(cell.column.id) && 'justify-end')}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                      <div className="flex-1" />
                    </div>
                  );
                })}
              </div>

              {modelRows.length === 0 && (
                <EmptyState loading={isPending} error={isError ? String(error) : null} filtered={isFiltered && all.length > 0} />
              )}
              <div data-empty="1" className="h-24" />
            </div>
          </div>
        </ContextMenuTrigger>
        <TorrentContextMenu />
      </ContextMenu>
      <BatchBar />
    </div>
  );
}

function SortIcon({ desc }: { desc: boolean }) {
  return desc ? <ArrowDownWideNarrow className="size-3 text-accent" /> : <ArrowUpNarrowWide className="size-3 text-accent" />;
}

function EmptyState({ loading, error, filtered }: { loading: boolean; error: string | null; filtered: boolean }) {
  const t = useT();
  const ui = useUi.getState();
  if (loading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex h-[34px] items-center gap-6 border-b border-line/50 px-3">
            <div className="h-2.5 animate-pulse rounded bg-surface-3" style={{ width: `${180 + ((i * 53) % 160)}px` }} />
            <div className="h-4 w-20 animate-pulse rounded-full bg-surface-2" />
            <div className="h-1.5 w-32 animate-pulse rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div data-empty="1" className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface-1 text-subtle">{filtered ? <SearchX className="size-5" /> : <Inbox className="size-5" />}</div>
      <div>
        <div className="font-medium">{error ? t('table.loadError') : filtered ? t('table.noMatch') : t('table.empty')}</div>
        <div className="mt-0.5 text-xs text-muted">{error ?? (filtered ? t('table.noMatchHint') : t('table.emptyHint'))}</div>
      </div>
      {filtered ? (
        <Button
          size="sm"
          onClick={() => {
            ui.setFilter('all');
            ui.setLabel(null);
            ui.setTracker(null);
            ui.setSearch('');
          }}
        >
          {t('table.clearFilters')}
        </Button>
      ) : (
        !error && (
          <Button size="sm" variant="primary" onClick={() => ui.openDialog({ kind: 'add', files: [], magnet: '' })}>
            {t('table.addTorrent')}
          </Button>
        )
      )}
    </div>
  );
}
