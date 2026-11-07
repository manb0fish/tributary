import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTorrentActions } from './actions';
import { keys, useSessionMutation } from './queries';
import { FILTERS } from '../lib/status';
import { useConnection } from '../lib/rpc/connection';
import type { SessionArguments } from '../lib/rpc/types';
import { useUi } from '../store/ui';
import { visibleOrder } from '../components/table/TorrentTable';

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

export function useGlobalShortcuts(): void {
  const actions = useTorrentActions();
  const setSession = useSessionMutation();
  const qc = useQueryClient();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      if (ui.dialog.kind !== 'none') return;
      if (document.querySelector('[role="menu"]')) return;
      const mod = e.metaKey || e.ctrlKey;

      if ((e.key === 'k' && mod) || (e.key === '/' && !isTyping(e.target))) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
        return;
      }
      if (isTyping(e.target)) return;

      const ids = [...ui.selected];
      const order = visibleOrder.current;

      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        ui.setSelection(order, order[0] ?? null);
        return;
      }
      if (mod || e.altKey) return;

      switch (e.key) {
        case 'Escape':
          if (ui.selected.size) ui.clearSelection();
          else if (ui.search) ui.setSearch('');
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          ui.moveFocus(1, e.shiftKey, order);
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          ui.moveFocus(-1, e.shiftKey, order);
          break;
        case 'Home':
          e.preventDefault();
          ui.moveFocus(-order.length, e.shiftKey, order);
          break;
        case 'End':
          e.preventDefault();
          ui.moveFocus(order.length, e.shiftKey, order);
          break;
        case ' ':
          e.preventDefault();
          void actions.toggle(ids);
          break;
        case 'Enter':
          ui.setInspectorOpen(true);
          break;
        case 'Delete':
        case 'Backspace':
          if (ids.length) ui.openDialog({ kind: 'remove', ids, deleteData: e.shiftKey });
          break;
        case 's':
          void actions.start(ids);
          break;
        case 'p':
          void actions.stop(ids);
          break;
        case 'v':
          void actions.verify(ids);
          break;
        case 'l':
          if (ids.length) ui.openDialog({ kind: 'labels', ids });
          break;
        case 'n':
        case 'o':
          ui.openDialog({ kind: 'add', files: [], magnet: '' });
          break;
        case 'i':
          ui.setInspectorOpen(!ui.inspectorOpen);
          break;
        case '[':
          ui.toggleSidebar();
          break;
        case ',':
          ui.openDialog({ kind: 'prefs' });
          break;
        case '?':
          ui.openDialog({ kind: 'shortcuts' });
          break;
        case 't': {
          const s = qc.getQueryData<SessionArguments>(keys.session(useConnection.getState().epoch));
          if (s) void setSession({ 'alt-speed-enabled': !s['alt-speed-enabled'] });
          break;
        }
        default:
          if (/^[1-7]$/.test(e.key)) {
            const f = FILTERS[Number(e.key) - 1];
            if (f) ui.setFilter(f.id);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, setSession, qc]);
}
