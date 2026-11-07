import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { client, useConnection } from '../lib/rpc/connection';
import { torrentCache } from '../lib/torrent-cache';
import { DETAIL_FIELDS, type SessionArguments, type TorrentDetail, type TorrentRow } from '../lib/rpc/types';
import { useSpeed, useUi } from '../store/ui';

const isReady = (mode: string) => mode === 'live' || mode === 'demo';

export const keys = {
  torrents: (epoch: number) => ['torrents', epoch] as const,
  session: (epoch: number) => ['session', epoch] as const,
  stats: (epoch: number) => ['stats', epoch] as const,
  freeSpace: (epoch: number, path: string) => ['free-space', epoch, path] as const,
  detail: (epoch: number, id: number) => ['detail', epoch, id] as const,
};

/** Push the cache's current snapshot into React Query (after optimistic edits). */
export function publishTorrents(qc: QueryClient): void {
  const epoch = useConnection.getState().epoch;
  qc.setQueryData<TorrentRow[]>(keys.torrents(epoch), torrentCache.snapshot());
}

export function useTorrents() {
  const { mode, epoch } = useConnection();
  const refreshMs = useUi((s) => s.refreshMs);

  useEffect(() => {
    useSpeed.getState().reset();
  }, [epoch]);

  return useQuery({
    queryKey: keys.torrents(epoch),
    queryFn: () => torrentCache.poll(epoch),
    enabled: isReady(mode),
    refetchInterval: refreshMs,
    refetchIntervalInBackground: false,
    structuralSharing: false,
    retry: 1,
  });
}

export function useStats() {
  const { mode, epoch } = useConnection();
  const refreshMs = useUi((s) => s.refreshMs);
  return useQuery({
    queryKey: keys.stats(epoch),
    queryFn: async () => {
      const s = await client.getStats();
      useSpeed.getState().pushGlobal({ t: Date.now(), down: s.downloadSpeed, up: s.uploadSpeed });
      return s;
    },
    enabled: isReady(mode),
    refetchInterval: refreshMs,
  });
}

export function useSession() {
  const { mode, epoch } = useConnection();
  return useQuery({
    queryKey: keys.session(epoch),
    queryFn: () => client.getSession(),
    enabled: isReady(mode),
    refetchInterval: 15_000,
  });
}

export function useFreeSpace(path: string | undefined) {
  const { mode, epoch } = useConnection();
  return useQuery({
    queryKey: keys.freeSpace(epoch, path ?? ''),
    queryFn: () => client.freeSpace(path ?? ''),
    enabled: isReady(mode) && !!path,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useTorrentDetail(id: number | null) {
  const { mode, epoch } = useConnection();
  const refreshMs = useUi((s) => s.refreshMs);
  const open = useUi((s) => s.inspectorOpen);
  return useQuery({
    queryKey: keys.detail(epoch, id ?? -1),
    queryFn: async (): Promise<TorrentDetail | null> => {
      if (id === null) return null;
      const { torrents } = await client.getTorrents(DETAIL_FIELDS, [id]);
      const row = torrentCache.get(id);
      if (row) useSpeed.getState().pushTorrent(id, { t: Date.now(), down: row.rateDownload, up: row.rateUpload });
      return torrents[0] ?? null;
    },
    enabled: isReady(mode) && id !== null && open,
    refetchInterval: refreshMs,
    placeholderData: (prev) => (prev && prev.id === id ? prev : undefined),
  });
}

/** Optimistically patch session args (e.g. turtle toggle) and push to daemon. */
export function useSessionMutation() {
  const qc = useQueryClient();
  const epoch = useConnection((s) => s.epoch);
  return async (patch: Partial<SessionArguments>) => {
    const key = keys.session(epoch);
    const prev = qc.getQueryData<SessionArguments>(key);
    if (prev) qc.setQueryData<SessionArguments>(key, { ...prev, ...patch });
    try {
      await client.setSession(patch);
    } catch (e) {
      if (prev) qc.setQueryData(key, prev);
      throw e;
    } finally {
      void qc.invalidateQueries({ queryKey: key });
    }
  };
}
