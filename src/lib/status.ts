import { TorrentError, TorrentStatus, type TorrentRow } from './rpc/types';
import { t as tr, type MessageKey } from '../i18n';

export type Tone = 'emerald' | 'sky' | 'amber' | 'zinc' | 'rose' | 'violet';

export interface StatusInfo {
  label: string;
  tone: Tone;
}

const s = (key: MessageKey, tone: Tone): StatusInfo => ({ label: tr(key), tone });

export function statusInfo(t: TorrentRow): StatusInfo {
  if (t.error === TorrentError.LocalError) return s('status.error', 'rose');
  if (t.error === TorrentError.TrackerError) return s('status.trackerError', 'rose');
  if (t.error === TorrentError.TrackerWarning && t.status !== TorrentStatus.Stopped) return s('status.trackerWarning', 'rose');
  switch (t.status) {
    case TorrentStatus.Stopped:
      return t.isFinished || t.percentDone >= 1 ? s('status.finished', 'zinc') : s('status.paused', 'zinc');
    case TorrentStatus.CheckWait:
      return s('status.checkQueued', 'amber');
    case TorrentStatus.Check:
      return s('status.checking', 'amber');
    case TorrentStatus.DownloadWait:
      return s('status.queued', 'amber');
    case TorrentStatus.Download:
      if (t.metadataPercentComplete < 1) return s('status.metadata', 'violet');
      if (t.isStalled) return s('status.stalled', 'sky');
      return s('status.downloading', 'sky');
    case TorrentStatus.SeedWait:
      return s('status.seedQueued', 'amber');
    case TorrentStatus.Seed:
      return s('status.seeding', 'emerald');
  }
}

/** Sort key giving a sensible "most interesting first" order. */
export function statusRank(t: TorrentRow): number {
  if (t.error) return 0;
  const order: Record<TorrentStatus, number> = { 4: 1, 2: 2, 1: 3, 3: 4, 6: 5, 5: 6, 0: 7 };
  return order[t.status];
}

export type FilterId = 'all' | 'downloading' | 'seeding' | 'active' | 'paused' | 'checking' | 'error';

export const FILTERS: ReadonlyArray<{ id: FilterId; label: MessageKey; match: (t: TorrentRow) => boolean }> = [
  { id: 'all', label: 'filters.all', match: () => true },
  {
    id: 'downloading',
    label: 'filters.downloading',
    match: (t) => t.status === TorrentStatus.Download || t.status === TorrentStatus.DownloadWait,
  },
  {
    id: 'seeding',
    label: 'filters.seeding',
    match: (t) => t.status === TorrentStatus.Seed || t.status === TorrentStatus.SeedWait,
  },
  {
    id: 'active',
    label: 'filters.active',
    match: (t) =>
      t.rateDownload > 0 ||
      t.rateUpload > 0 ||
      t.peersSendingToUs > 0 ||
      t.peersGettingFromUs > 0 ||
      t.status === TorrentStatus.Check,
  },
  { id: 'paused', label: 'filters.paused', match: (t) => t.status === TorrentStatus.Stopped },
  {
    id: 'checking',
    label: 'filters.checking',
    match: (t) => t.status === TorrentStatus.Check || t.status === TorrentStatus.CheckWait,
  },
  { id: 'error', label: 'filters.error', match: (t) => t.error !== TorrentError.None },
];

const domainCache = new Map<string, string>();

/** "udp://tracker.opentrackr.org:1337/announce" → "opentrackr.org" */
export function trackerDomain(announce: string): string {
  const hit = domainCache.get(announce);
  if (hit) return hit;
  let host = announce;
  try {
    host = new URL(announce.replace(/^udp:/i, 'http:')).hostname;
  } catch {
    /* keep raw */
  }
  let out = host;
  if (!/^[\d.]+$/.test(host) && !host.includes(':')) {
    const parts = host.split('.');
    const n = parts.length;
    const sld = parts[n - 2] ?? '';
    const tld = parts[n - 1] ?? '';
    const take = n > 2 && tld.length <= 2 && sld.length <= 3 ? 3 : 2;
    out = parts.slice(-take).join('.');
  }
  domainCache.set(announce, out);
  return out;
}

export function primaryTracker(t: TorrentRow): string {
  const first = t.trackers[0];
  return first ? trackerDomain(first.announce) : '';
}
