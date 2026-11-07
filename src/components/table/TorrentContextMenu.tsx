import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  FolderInput,
  Gauge,
  Hash,
  Link2,
  ListOrdered,
  Megaphone,
  Pause,
  Play,
  RefreshCw,
  Tag,
  Trash2,
  Zap,
} from 'lucide-react';
import { useTorrentActions } from '../../hooks/actions';
import { torrentCache } from '../../lib/torrent-cache';
import { Priority, TorrentStatus } from '../../lib/rpc/types';
import { useUi } from '../../store/ui';
import { useT } from '../../i18n';
import { ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub } from '../ui/menu';

export function TorrentContextMenu() {
  const t = useT();
  const selected = useUi((s) => s.selected);
  const actions = useTorrentActions();
  const ui = useUi.getState();
  const ids = [...selected];
  const rows = ids.map((id) => torrentCache.get(id)).filter((t) => t !== undefined);
  const none = ids.length === 0;
  const anyStopped = rows.some((r) => r.status === TorrentStatus.Stopped);
  const anyRunning = rows.some((r) => r.status !== TorrentStatus.Stopped);
  const single = rows.length === 1 ? rows[0] : undefined;

  return (
    <ContextMenuContent className="w-[17rem]">
      <ContextMenuLabel>{none ? t('ctx.noSelection') : single ? single.name : t('common.torrents', { count: ids.length })}</ContextMenuLabel>
      <ContextMenuItem icon={<Play />} shortcut="S" disabled={!anyStopped} onSelect={() => actions.start(ids)}>
        {t('ctx.start')}
      </ContextMenuItem>
      <ContextMenuItem icon={<Zap />} disabled={none} onSelect={() => actions.startNow(ids)}>
        {t('ctx.startNow')}
      </ContextMenuItem>
      <ContextMenuItem icon={<Pause />} shortcut="P" disabled={!anyRunning} onSelect={() => actions.stop(ids)}>
        {t('ctx.pause')}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem icon={<RefreshCw />} shortcut="V" disabled={none} onSelect={() => actions.verify(ids)}>
        {t('ctx.verify')}
      </ContextMenuItem>
      <ContextMenuItem icon={<Megaphone />} disabled={none} onSelect={() => actions.reannounce(ids)}>
        {t('ctx.reannounce')}
      </ContextMenuItem>
      <ContextMenuSub label={t('ctx.queue')} icon={<ListOrdered />}>
        <ContextMenuItem icon={<ArrowUpToLine />} disabled={none} onSelect={() => actions.queueMove(ids, 'top')}>
          {t('ctx.moveTop')}
        </ContextMenuItem>
        <ContextMenuItem icon={<ChevronUp />} disabled={none} onSelect={() => actions.queueMove(ids, 'up')}>
          {t('ctx.moveUp')}
        </ContextMenuItem>
        <ContextMenuItem icon={<ChevronDown />} disabled={none} onSelect={() => actions.queueMove(ids, 'down')}>
          {t('ctx.moveDown')}
        </ContextMenuItem>
        <ContextMenuItem icon={<ArrowDownToLine />} disabled={none} onSelect={() => actions.queueMove(ids, 'bottom')}>
          {t('ctx.moveBottom')}
        </ContextMenuItem>
      </ContextMenuSub>
      <ContextMenuSub label={t('ctx.bandwidth')} icon={<Gauge />}>
        <ContextMenuItem disabled={none} onSelect={() => actions.setBandwidthPriority(ids, Priority.High)}>
          {t('ctx.high')}
        </ContextMenuItem>
        <ContextMenuItem disabled={none} onSelect={() => actions.setBandwidthPriority(ids, Priority.Normal)}>
          {t('ctx.normal')}
        </ContextMenuItem>
        <ContextMenuItem disabled={none} onSelect={() => actions.setBandwidthPriority(ids, Priority.Low)}>
          {t('ctx.low')}
        </ContextMenuItem>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem icon={<Tag />} shortcut="L" disabled={none} onSelect={() => ui.openDialog({ kind: 'labels', ids })}>
        {t('ctx.editLabels')}
      </ContextMenuItem>
      <ContextMenuItem icon={<FolderInput />} disabled={none} onSelect={() => ui.openDialog({ kind: 'location', ids })}>
        {t('ctx.setLocation')}
      </ContextMenuItem>
      <ContextMenuSub label={t('ctx.copy')} icon={<Copy />}>
        <ContextMenuItem icon={<Link2 />} disabled={none} onSelect={() => actions.copyMagnets(ids)}>
          {t('ctx.magnet', { count: ids.length })}
        </ContextMenuItem>
        <ContextMenuItem icon={<Copy />} disabled={none} onSelect={() => actions.copyText(rows.map((r) => r.name).join('\n'), t('ctx.name'))}>
          {t('ctx.name')}
        </ContextMenuItem>
        <ContextMenuItem icon={<Hash />} disabled={none} onSelect={() => actions.copyText(rows.map((r) => r.hashString).join('\n'), t('ctx.hash'))}>
          {t('ctx.hash')}
        </ContextMenuItem>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem icon={<Trash2 />} shortcut="Del" destructive disabled={none} onSelect={() => ui.openDialog({ kind: 'remove', ids, deleteData: false })}>
        {t('ctx.remove')}
      </ContextMenuItem>
      <ContextMenuItem icon={<Trash2 />} shortcut="⇧Del" destructive disabled={none} onSelect={() => ui.openDialog({ kind: 'remove', ids, deleteData: true })}>
        {t('ctx.removeDelete')}
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
