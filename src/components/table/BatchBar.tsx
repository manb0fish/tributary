import { FolderInput, Pause, Play, RefreshCw, Tag, Trash2, X } from 'lucide-react';
import { useTorrentActions } from '../../hooks/actions';
import { useUi } from '../../store/ui';
import { Button } from '../ui/button';
import { Tip } from '../ui/misc';
import { useT } from '../../i18n';

/** Floating glass action bar shown while several torrents are selected. */
export function BatchBar() {
  const t = useT();
  const selected = useUi((s) => s.selected);
  const actions = useTorrentActions();
  const ui = useUi.getState();
  if (selected.size < 2) return null;
  const ids = [...selected];

  return (
    <div className="animate-slide-up glass absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-line-strong py-1 pr-1 pl-3 shadow-xl shadow-black/20">
      <span className="num mr-2 text-xs font-medium whitespace-nowrap">
        {t('common.selected', { count: selected.size })}
      </span>
      <Tip label={t('toolbar.start')} side="top">
        <Button variant="ghost" size="icon-sm" onClick={() => actions.start(ids)} aria-label={t('toolbar.start')}>
          <Play />
        </Button>
      </Tip>
      <Tip label={t('toolbar.pause')} side="top">
        <Button variant="ghost" size="icon-sm" onClick={() => actions.stop(ids)} aria-label={t('toolbar.pause')}>
          <Pause />
        </Button>
      </Tip>
      <Tip label={t('toolbar.verify')} side="top">
        <Button variant="ghost" size="icon-sm" onClick={() => actions.verify(ids)} aria-label={t('toolbar.verify')}>
          <RefreshCw />
        </Button>
      </Tip>
      <Tip label={t('batch.labels')} side="top">
        <Button variant="ghost" size="icon-sm" onClick={() => ui.openDialog({ kind: 'labels', ids })} aria-label={t('batch.labels')}>
          <Tag />
        </Button>
      </Tip>
      <Tip label={t('batch.location')} side="top">
        <Button variant="ghost" size="icon-sm" onClick={() => ui.openDialog({ kind: 'location', ids })} aria-label={t('batch.location')}>
          <FolderInput />
        </Button>
      </Tip>
      <Tip label={t('toolbar.remove')} side="top">
        <Button variant="ghost" size="icon-sm" className="hover:!text-rose-500" onClick={() => ui.openDialog({ kind: 'remove', ids, deleteData: false })} aria-label={t('toolbar.remove')}>
          <Trash2 />
        </Button>
      </Tip>
      <div className="mx-1 h-4 w-px bg-line" />
      <Tip label={t('batch.clear')} side="top" shortcut="Esc">
        <Button variant="ghost" size="icon-sm" onClick={ui.clearSelection} aria-label={t('batch.clear')}>
          <X />
        </Button>
      </Tip>
    </div>
  );
}
