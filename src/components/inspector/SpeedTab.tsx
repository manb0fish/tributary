import type { TorrentRow } from '../../lib/rpc/types';
import { formatSpeed } from '../../lib/format';
import { useSpeed } from '../../store/ui';
import { SpeedChart } from '../ui/speed-chart';
import { useT } from '../../i18n';

export function SpeedTab({ row, height }: { row: TorrentRow; height: number }) {
  const t = useT();
  const samples = useSpeed((s) => s.perTorrent.get(row.id)) ?? [];
  const peakDown = Math.max(0, ...samples.map((s) => s.down));
  const peakUp = Math.max(0, ...samples.map((s) => s.up));
  const avg = (k: 'down' | 'up') => (samples.length ? samples.reduce((a, s) => a + s[k], 0) / samples.length : 0);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <Legend color="var(--chart-down)" label={t('speed.download')} now={row.rateDownload} avg={avg('down')} peak={peakDown} />
        <Legend color="var(--chart-up)" label={t('speed.upload')} now={row.rateUpload} avg={avg('up')} peak={peakUp} />
        <span className="ml-auto text-[11px] text-subtle">{t('speed.note', { count: samples.length })}</span>
      </div>
      <div className="min-h-0 flex-1 rounded-lg border border-line bg-surface-0/60 p-2">
        {samples.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-subtle">{t('speed.collecting')}</div>
        ) : (
          <SpeedChart samples={samples} height={Math.max(60, height - 96)} axis span={120} />
        )}
      </div>
    </div>
  );
}

function Legend({ color, label, now, avg, peak }: { color: string; label: string; now: number; avg: number; peak: number }) {
  const t = useT();
  return (
    <span className="flex items-center gap-2">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="font-medium">{label}</span>
      <span className="num">{formatSpeed(now, '0 B/s')}</span>
      <span className="num text-subtle">{t('speed.avgPeak', { avg: formatSpeed(avg, '0 B/s'), peak: formatSpeed(peak, '0 B/s') })}</span>
    </span>
  );
}
