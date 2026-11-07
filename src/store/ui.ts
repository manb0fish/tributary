import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SortingState, VisibilityState, ColumnSizingState } from '@tanstack/react-table';
import type { FilterId } from '../lib/status';
import type { ConnectionPreference } from '../lib/rpc/connection';

export type Theme = 'dark' | 'light' | 'system';
export type InspectorTab = 'general' | 'files' | 'peers' | 'trackers' | 'speed';

export type DialogState =
  | { kind: 'none' }
  | { kind: 'add'; files: File[]; magnet: string }
  | { kind: 'remove'; ids: number[]; deleteData: boolean }
  | { kind: 'labels'; ids: number[] }
  | { kind: 'location'; ids: number[] }
  | { kind: 'prefs' }
  | { kind: 'shortcuts' };

interface UiState {
  // filters
  filter: FilterId;
  label: string | null;
  tracker: string | null;
  search: string;
  // selection
  selected: ReadonlySet<number>;
  anchor: number | null;
  focused: number | null;
  // table
  sorting: SortingState;
  columnSizing: ColumnSizingState;
  columnVisibility: VisibilityState;
  // layout
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  inspectorHeight: number;
  inspectorTab: InspectorTab;
  // prefs
  theme: Theme;
  refreshMs: number;
  connection: ConnectionPreference;
  dialog: DialogState;

  setFilter: (f: FilterId) => void;
  setLabel: (l: string | null) => void;
  setTracker: (t: string | null) => void;
  setSearch: (s: string) => void;

  /** Click semantics: plain = replace, toggle = Ctrl/Cmd, range = Shift. */
  clickRow: (id: number, mods: { toggle: boolean; range: boolean }, order: readonly number[]) => void;
  setSelection: (ids: Iterable<number>, focused?: number | null) => void;
  clearSelection: () => void;
  moveFocus: (delta: number, extend: boolean, order: readonly number[]) => void;
  dropFromSelection: (ids: readonly number[]) => void;

  setSorting: (s: SortingState) => void;
  setColumnSizing: (s: ColumnSizingState) => void;
  setColumnVisibility: (s: VisibilityState) => void;

  toggleSidebar: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorHeight: (h: number) => void;
  setInspectorTab: (t: InspectorTab) => void;

  setTheme: (t: Theme) => void;
  setRefreshMs: (ms: number) => void;
  setConnection: (c: ConnectionPreference) => void;
  openDialog: (d: DialogState) => void;
  closeDialog: () => void;
}

export const DEFAULT_HIDDEN: VisibilityState = {
  uploadedEver: false,
  downloadedEver: false,
  queuePosition: false,
  downloadDir: false,
  tracker: false,
  doneDate: false,
};

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      filter: 'all',
      label: null,
      tracker: null,
      search: '',
      selected: new Set<number>(),
      anchor: null,
      focused: null,
      sorting: [{ id: 'queuePosition', desc: false }],
      columnSizing: {},
      columnVisibility: DEFAULT_HIDDEN,
      sidebarOpen: true,
      inspectorOpen: true,
      inspectorHeight: 300,
      inspectorTab: 'general',
      theme: 'dark',
      refreshMs: 2000,
      connection: 'auto',
      dialog: { kind: 'none' },

      setFilter: (filter) => set({ filter }),
      setLabel: (label) => set({ label }),
      setTracker: (tracker) => set({ tracker }),
      setSearch: (search) => set({ search }),

      clickRow: (id, { toggle, range }, order) => {
        const { selected, anchor } = get();
        if (range && anchor !== null) {
          const a = order.indexOf(anchor);
          const b = order.indexOf(id);
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            const next = toggle ? new Set(selected) : new Set<number>();
            for (let i = lo; i <= hi; i++) next.add(order[i]!);
            set({ selected: next, focused: id });
            return;
          }
        }
        if (toggle) {
          const next = new Set(selected);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          set({ selected: next, anchor: id, focused: next.has(id) ? id : get().focused === id ? null : get().focused });
          return;
        }
        set({ selected: new Set([id]), anchor: id, focused: id });
      },
      setSelection: (ids, focused) => {
        const next = new Set(ids);
        set({ selected: next, focused: focused === undefined ? get().focused : focused });
      },
      clearSelection: () => set({ selected: new Set(), anchor: null }),
      moveFocus: (delta, extend, order) => {
        if (!order.length) return;
        const { focused, anchor, selected } = get();
        const cur = focused !== null ? order.indexOf(focused) : -1;
        const nextIdx = Math.max(0, Math.min(order.length - 1, cur === -1 ? (delta > 0 ? 0 : order.length - 1) : cur + delta));
        const id = order[nextIdx]!;
        if (extend && anchor !== null) {
          const a = order.indexOf(anchor);
          const [lo, hi] = a < nextIdx ? [a, nextIdx] : [nextIdx, a];
          const next = new Set<number>();
          for (let i = lo; i <= hi; i++) next.add(order[i]!);
          set({ selected: next, focused: id });
        } else {
          set({ selected: extend ? new Set([...selected, id]) : new Set([id]), anchor: id, focused: id });
        }
      },
      dropFromSelection: (ids) => {
        const next = new Set(get().selected);
        for (const id of ids) next.delete(id);
        const f = get().focused;
        set({ selected: next, focused: f !== null && ids.includes(f) ? null : f });
      },

      setSorting: (sorting) => set({ sorting }),
      setColumnSizing: (columnSizing) => set({ columnSizing }),
      setColumnVisibility: (columnVisibility) => set({ columnVisibility }),

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
      setInspectorHeight: (inspectorHeight) => set({ inspectorHeight }),
      setInspectorTab: (inspectorTab) => set({ inspectorTab }),

      setTheme: (theme) => set({ theme }),
      setRefreshMs: (refreshMs) => set({ refreshMs }),
      setConnection: (connection) => set({ connection }),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: { kind: 'none' } }),
    }),
    {
      name: 'tr-ui',
      version: 1,
      partialize: (s) => ({
        sorting: s.sorting,
        columnSizing: s.columnSizing,
        columnVisibility: s.columnVisibility,
        sidebarOpen: s.sidebarOpen,
        inspectorOpen: s.inspectorOpen,
        inspectorHeight: s.inspectorHeight,
        inspectorTab: s.inspectorTab,
        theme: s.theme,
        refreshMs: s.refreshMs,
        connection: s.connection,
      }),
    },
  ),
);

/* ----------------------------------------------------------------- toasts */

export interface Toast {
  id: number;
  tone: 'info' | 'success' | 'error';
  title: string;
  body?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-4), { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), t.tone === 'error' ? 7000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = {
  info: (title: string, body?: string) => useToasts.getState().push({ tone: 'info', title, body }),
  success: (title: string, body?: string) => useToasts.getState().push({ tone: 'success', title, body }),
  error: (title: string, body?: string) => useToasts.getState().push({ tone: 'error', title, body }),
};

/* ---------------------------------------------------------- speed history */

export interface SpeedSample {
  t: number;
  down: number;
  up: number;
}

const HISTORY = 120;

interface SpeedState {
  global: SpeedSample[];
  perTorrent: Map<number, SpeedSample[]>;
  pushGlobal: (s: SpeedSample) => void;
  pushTorrent: (id: number, s: SpeedSample) => void;
  reset: () => void;
}

export const useSpeed = create<SpeedState>((set, get) => ({
  global: [],
  perTorrent: new Map(),
  pushGlobal: (s) => set({ global: [...get().global.slice(-(HISTORY - 1)), s] }),
  pushTorrent: (id, s) => {
    const map = new Map(get().perTorrent);
    const prev = map.get(id) ?? [];
    map.set(id, [...prev.slice(-(HISTORY - 1)), s]);
    // Only remember the most recently inspected few torrents.
    if (map.size > 8) map.delete(map.keys().next().value as number);
    set({ perTorrent: map });
  },
  reset: () => set({ global: [], perTorrent: new Map() }),
}));
