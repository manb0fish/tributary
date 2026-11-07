import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { client } from '../lib/rpc/connection';
import { RpcError } from '../lib/rpc/client';
import { torrentCache } from '../lib/torrent-cache';
import { Priority, TorrentStatus, type TorrentAddArgs, type TorrentRow } from '../lib/rpc/types';
import { publishTorrents } from './queries';
import { toast, useUi } from '../store/ui';
import { t, type MessageKey } from '../i18n';

const errMsg = (e: unknown) => (e instanceof RpcError ? e.message : e instanceof Error ? e.message : String(e));
type ActionKey = Extract<MessageKey, `actions.${'start' | 'pause' | 'verify' | 'reannounce' | 'setLabels' | 'setLocation' | 'queueMove' | 'setPriority'}`>;

export function useTorrentActions() {
  const qc = useQueryClient();

  return useMemo(() => {
    const refreshDetail = () => qc.invalidateQueries({ queryKey: ['detail'] });

    /** Apply an optimistic patch, run the RPC, then reconcile from the daemon. */
    async function run(
      ids: number[],
      label: ActionKey,
      call: () => Promise<unknown>,
      optimistic?: (t: TorrentRow) => Partial<TorrentRow>,
    ): Promise<boolean> {
      if (!ids.length) return false;
      const prev = optimistic ? torrentCache.patch(ids, optimistic) : [];
      if (prev.length) publishTorrents(qc);
      try {
        await call();
        await torrentCache.refresh(ids).catch(() => undefined);
        publishTorrents(qc);
        void refreshDetail();
        return true;
      } catch (e) {
        torrentCache.restore(prev);
        publishTorrents(qc);
        toast.error(t('actions.failed', { action: t(label) }), errMsg(e));
        return false;
      }
    }

    const stopped = (): Partial<TorrentRow> => ({
      status: TorrentStatus.Stopped,
      rateDownload: 0,
      rateUpload: 0,
      eta: -1,
      peersConnected: 0,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
    });
    const started = (t: TorrentRow): Partial<TorrentRow> =>
      t.status === TorrentStatus.Check || t.status === TorrentStatus.CheckWait
        ? {}
        : { status: t.leftUntilDone > 0 || t.metadataPercentComplete < 1 ? TorrentStatus.Download : TorrentStatus.Seed };

    return {
      start: (ids: number[]) => run(ids, 'actions.start', () => client.start(ids), started),
      startNow: (ids: number[]) => run(ids, 'actions.start', () => client.startNow(ids), started),
      stop: (ids: number[]) => run(ids, 'actions.pause', () => client.stop(ids), stopped),
      verify: (ids: number[]) =>
        run(ids, 'actions.verify', () => client.verify(ids), () => ({ status: TorrentStatus.CheckWait, rateDownload: 0, rateUpload: 0 })),
      reannounce: async (ids: number[]) => {
        if (await run(ids, 'actions.reannounce', () => client.reannounce(ids))) toast.info(t('actions.reannounced'), t('common.torrents', { count: ids.length }));
      },
      toggle: (ids: number[]) => {
        const rows = ids.map((id) => torrentCache.get(id)).filter((t): t is TorrentRow => !!t);
        const anyRunning = rows.some((t) => t.status !== TorrentStatus.Stopped);
        return anyRunning
          ? run(ids, 'actions.pause', () => client.stop(ids), stopped)
          : run(ids, 'actions.start', () => client.start(ids), started);
      },
      remove: async (ids: number[], deleteData: boolean) => {
        if (!ids.length) return;
        const prev = torrentCache.remove(ids);
        useUi.getState().dropFromSelection(ids);
        publishTorrents(qc);
        try {
          await client.remove(ids, deleteData);
          toast.success(t('actions.removed', { count: ids.length }), deleteData ? t('actions.dataDeleted') : undefined);
        } catch (e) {
          torrentCache.restore(prev);
          publishTorrents(qc);
          toast.error(t('actions.removeFailed'), errMsg(e));
        }
      },
      setLabels: (ids: number[], labels: string[]) =>
        run(ids, 'actions.setLabels', () => client.setLabels(ids, labels), () => ({ labels })),
      setBandwidthPriority: (ids: number[], p: Priority) =>
        run(ids, 'actions.setPriority', () => client.call('torrent-set', { ids, bandwidthPriority: p })),
      copyMagnets: async (ids: number[]) => {
        try {
          const { torrents } = await client.getTorrents(['magnetLink'], ids);
          await navigator.clipboard.writeText(torrents.map((t) => t.magnetLink).join('\n'));
          toast.success(t('actions.magnetCopied', { count: ids.length }));
        } catch (e) {
          toast.error(t('actions.magnetFailed'), errMsg(e));
        }
      },
      copyText: async (text: string, what: string) => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(t('actions.copied', { what }));
        } catch (e) {
          toast.error(t('actions.clipboardFailed'), errMsg(e));
        }
      },
      setLocation: (ids: number[], location: string, move: boolean) =>
        run(ids, 'actions.setLocation', () => client.setLocation(ids, location, move), () => ({ downloadDir: location })),
      queueMove: (ids: number[], where: 'top' | 'up' | 'down' | 'bottom') =>
        run(ids, 'actions.queueMove', async () => {
          await client.queueMove(ids, where);
          // Queue moves shift *other* torrents too — resync everything.
          torrentCache.invalidate();
          await qc.invalidateQueries({ queryKey: ['torrents'] });
        }),
      setFilesWanted: async (id: number, files: number[], wanted: boolean) => {
        try {
          await client.setFilesWanted(id, files, wanted);
          await torrentCache.refresh([id]);
          publishTorrents(qc);
          await refreshDetail();
        } catch (e) {
          toast.error(t('actions.filesFailed'), errMsg(e));
        }
      },
      setFilesPriority: async (id: number, files: number[], priority: Priority) => {
        try {
          await client.setFilesPriority(id, files, priority);
          await refreshDetail();
        } catch (e) {
          toast.error(t('actions.priorityFailed'), errMsg(e));
        }
      },
      add: async (args: TorrentAddArgs, label: string): Promise<boolean> => {
        try {
          const res = await client.add(args);
          const added = res['torrent-added'];
          const dup = res['torrent-duplicate'];
          if (added) {
            await torrentCache.refresh([added.id]);
            publishTorrents(qc);
            toast.success(t('actions.added'), added.name);
          } else if (dup) {
            toast.info(t('actions.duplicate'), dup.name);
          }
          return true;
        } catch (e) {
          toast.error(t('actions.addFailed', { what: label }), errMsg(e));
          return false;
        }
      },
    };
  }, [qc]);
}

export type TorrentActions = ReturnType<typeof useTorrentActions>;
