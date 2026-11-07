/** Small app-shell pieces: status bar, toasts, global drop overlay, connection banner. */
import { AlertTriangle, CheckCircle2, FileUp, Info, Loader2, Plug, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession, useStats, useTorrents } from '../hooks/queries';
import { formatSpeed } from '../lib/format';
import { cn } from '../lib/cn';
import { useConnection } from '../lib/rpc/connection';
import { useToasts, useUi } from '../store/ui';
import { visibleOrder } from './table/TorrentTable';
import { Button } from './ui/button';
import { isTorrentFile } from './dialogs/AddTorrentDialog';
import { useT } from '../i18n';

export function StatusBar() {
  const t = useT();
  const { data: torrents = [] } = useTorrents();
  const { data: stats } = useStats();
  const { data: session } = useSession();
  const selected = useUi((s) => s.selected);
  const mode = useConnection((s) => s.mode);
  const visible = visibleOrder.current.length;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-surface-1 px-3 text-[11px] text-muted">
      <span className="num">{visible !== torrents.length ? t('statusbar.filtered', { visible, total: torrents.length }) : t('common.torrents', { count: visible })}</span>
      {selected.size > 0 && <span className="num">{t('common.selected', { count: selected.size })}</span>}
      <span className="flex-1" />
      {session?.['speed-limit-down-enabled'] && !session['alt-speed-enabled'] && <span className="num text-subtle">{t('statusbar.downLimit', { n: session['speed-limit-down'] })}</span>}
      <span className="num flex items-center gap-1">
        <span className="text-chart-down">↓</span> {formatSpeed(stats?.downloadSpeed ?? 0, '0 B/s')}
      </span>
      <span className="num flex items-center gap-1">
        <span className="text-chart-up">↑</span> {formatSpeed(stats?.uploadSpeed ?? 0, '0 B/s')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn('size-1.5 rounded-full', mode === 'live' ? 'bg-emerald-500' : mode === 'demo' ? 'bg-violet-500' : mode === 'error' ? 'bg-rose-500' : 'animate-pulse bg-amber-500')} />
        {mode === 'live' ? t('statusbar.connected') : mode === 'demo' ? t('statusbar.demo') : mode === 'error' ? t('statusbar.disconnected') : t('statusbar.connecting')}
      </span>
    </footer>
  );
}

export function Toaster() {
  const t = useT();
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed right-4 bottom-10 z-[70] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="animate-pop-in glass pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line-strong px-3 py-2.5 shadow-xl shadow-black/20">
          <span className="mt-px [&_svg]:size-4">
            {toast.tone === 'success' ? <CheckCircle2 className="text-emerald-500" /> : toast.tone === 'error' ? <XCircle className="text-rose-500" /> : <Info className="text-sky-500" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">{toast.title}</div>
            {toast.body && <div className="mt-0.5 truncate text-xs text-muted">{toast.body}</div>}
          </div>
          <button onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-subtle hover:text-fg" aria-label={t('common.dismiss')}>
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Drag a .torrent file (or a magnet link) anywhere on the window to add it. */
export function DropOverlay() {
  const t = useT();
  const [active, setActive] = useState(false);
  useEffect(() => {
    let depth = 0;
    const hasPayload = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].some((t) => t === 'Files' || t === 'text/uri-list' || t === 'text/plain');
    const enter = (e: DragEvent) => {
      if (!hasPayload(e) || useUi.getState().dialog.kind !== 'none') return;
      depth++;
      setActive(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setActive(false);
    };
    const over = (e: DragEvent) => {
      if (hasPayload(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      depth = 0;
      setActive(false);
      if (!e.dataTransfer || useUi.getState().dialog.kind !== 'none') return;
      e.preventDefault();
      const files = [...e.dataTransfer.files].filter(isTorrentFile);
      const text = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).trim();
      const magnet = /^(magnet:|https?:)/i.test(text) ? text : '';
      if (files.length || magnet) useUi.getState().openDialog({ kind: 'add', files, magnet });
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="animate-fade-in pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-sky-500/5 p-6 backdrop-blur-[2px]">
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sky-500/60">
        <div className="flex size-12 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
          <FileUp className="size-6" />
        </div>
        <div className="text-[15px] font-semibold">{t('drop.title')}</div>
        <div className="text-xs text-muted">{t('drop.hint')}</div>
      </div>
    </div>
  );
}

export function ConnectionGate() {
  const t = useT();
  const mode = useConnection((s) => s.mode);
  const error = useConnection((s) => s.error);
  const rpcUrl = useConnection((s) => s.rpcUrl);
  if (mode !== 'error' && mode !== 'connecting') return null;
  if (mode === 'connecting') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-0/60">
        <Loader2 className="size-5 animate-spin text-subtle" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-0/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-line-strong bg-surface-1 p-5 text-center shadow-xl">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
          <AlertTriangle className="size-5" />
        </div>
        <div className="font-semibold">{t('gate.title')}</div>
        <div className="mt-1 text-xs text-muted">{error}</div>
        <div className="num mt-2 text-[11px] text-subtle">{rpcUrl}</div>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              useUi.getState().setConnection('demo');
              void useConnection.getState().connect('demo');
            }}
          >
            {t('gate.useDemo')}
          </Button>
          <Button variant="primary" onClick={() => void useConnection.getState().connect(useUi.getState().connection)}>
            <Plug /> {t('gate.retry')}
          </Button>
        </div>
      </div>
    </div>
  );
}
