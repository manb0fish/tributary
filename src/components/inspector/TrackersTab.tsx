import type { TorrentDetail, TrackerStat } from '../../lib/rpc/types';
import { formatNumber, formatRelative } from '../../lib/format';
import { Pill } from '../ui/misc';
import { t as tr, useT } from '../../i18n';

function state(t: TrackerStat): { label: string; tone: 'emerald' | 'rose' | 'zinc' | 'amber' } {
  if (t.announceState === 3) return { label: tr('trackers.announcing'), tone: 'amber' };
  if (t.hasAnnounced && !t.lastAnnounceSucceeded) return { label: tr('trackers.error'), tone: 'rose' };
  if (t.hasAnnounced && t.lastAnnounceSucceeded) return { label: tr('trackers.working'), tone: 'emerald' };
  return { label: tr('trackers.inactive'), tone: 'zinc' };
}

const count = (n: number) => (n < 0 ? '—' : formatNumber(n));

export function TrackersTab({ detail }: { detail: TorrentDetail | null }) {
  useT();
  if (!detail) return <div className="flex h-full items-center justify-center text-xs text-subtle">{tr('trackers.loading')}</div>;
  if (!detail.trackerStats.length) return <div className="flex h-full items-center justify-center text-xs text-subtle">{tr('trackers.none')}</div>;

  return (
    <div className="space-y-2 p-3">
      {detail.trackerStats.map((t) => {
        const s = state(t);
        return (
          <div key={t.id} className="rounded-lg border border-line bg-surface-0/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="num rounded bg-surface-3 px-1.5 py-px text-[10px] text-muted">T{t.tier + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={t.announce}>
                {t.host}
              </span>
              <Pill tone={s.tone}>{s.label}</Pill>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:grid-cols-5">
              <Stat k={tr('trackers.seeders')} v={count(t.seederCount)} />
              <Stat k={tr('trackers.leechers')} v={count(t.leecherCount)} />
              <Stat k={tr('trackers.downloads')} v={count(t.downloadCount)} />
              <Stat
                k={tr('trackers.lastAnnounce')}
                v={t.hasAnnounced ? `${formatRelative(t.lastAnnounceTime)}${t.lastAnnounceSucceeded ? ` · ${tr('trackers.peerCount', { count: t.lastAnnouncePeerCount })}` : ''}` : '—'}
              />
              <Stat k={tr('trackers.nextAnnounce')} v={t.nextAnnounceTime > 0 ? formatRelative(t.nextAnnounceTime) : '—'} />
            </div>
            {t.hasAnnounced && !t.lastAnnounceSucceeded && t.lastAnnounceResult && (
              <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">{t.lastAnnounceResult}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] text-subtle">{k}</div>
      <div className="num truncate">{v}</div>
    </div>
  );
}
