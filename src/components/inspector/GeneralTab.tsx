import { AlertCircle, Copy } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { TorrentDetail, TorrentRow } from '../../lib/rpc/types';
import { TorrentStatus } from '../../lib/rpc/types';
import { formatBytes, formatDate, formatDuration, formatEta, formatPercent, formatRatio, formatSpeed } from '../../lib/format';
import { statusInfo } from '../../lib/status';
import { useTorrentActions } from '../../hooks/actions';
import { Pill } from '../ui/misc';
import { useT } from '../../i18n';

export function GeneralTab({ row: t, detail: d }: { row: TorrentRow; detail: TorrentDetail | null }) {
  const tr = useT();
  const actions = useTorrentActions();
  const s = statusInfo(t);
  const have = t.sizeWhenDone - t.leftUntilDone;

  return (
    <div className="space-y-4 p-4">
      {t.error !== 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          <span>{t.errorString}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-3 text-xs">
          <Pill tone={s.tone}>{s.label}</Pill>
          <span className="num text-muted">
            {tr('general.progress', { have: formatBytes(have), total: formatBytes(t.sizeWhenDone), pct: formatPercent(t.percentDone) })}
          </span>
          {t.status === TorrentStatus.Download && t.eta >= 0 && <span className="num text-subtle">· {tr('general.left', { eta: formatEta(t.eta) })}</span>}
          <span className="flex-1" />
          {d && <span className="num text-[11px] text-subtle">{tr('general.pieces', { count: d.pieceCount, size: formatBytes(d.pieceSize) })}</span>}
        </div>
        <PiecesBar pieces={d?.pieces ?? ''} count={d?.pieceCount ?? 0} done={t.percentDone >= 1} />
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
        <Group title={tr('general.transfer')}>
          <KV k={tr('general.downloaded')} v={formatBytes(t.downloadedEver)} />
          <KV k={tr('general.uploaded')} v={formatBytes(t.uploadedEver)} />
          <KV k={tr('general.ratio')} v={formatRatio(t.uploadRatio)} />
          <KV k={tr('general.downSpeed')} v={formatSpeed(t.rateDownload, '0 B/s')} />
          <KV k={tr('general.upSpeed')} v={formatSpeed(t.rateUpload, '0 B/s')} />
          <KV k={tr('general.peers')} v={tr('general.peersValue', { connected: t.peersConnected, down: t.peersSendingToUs, up: t.peersGettingFromUs })} />
          {d && <KV k={tr('general.corrupt')} v={formatBytes(d.corruptEver)} />}
        </Group>
        <Group title={tr('general.torrent')}>
          <KV k={tr('general.size')} v={formatBytes(t.totalSize)} />
          <KV
            k={tr('general.hash')}
            v={
              <button className="group inline-flex max-w-full items-center gap-1 hover:text-fg" onClick={() => actions.copyText(t.hashString, tr('ctx.hash'))} title={tr('general.copyHash')}>
                <span className="truncate">{t.hashString}</span>
                <Copy className="size-3 shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            }
          />
          {d && <KV k={tr('general.privacy')} v={d.isPrivate ? tr('general.private') : tr('general.public')} plain />}
          {d && <KV k={tr('general.created')} v={`${formatDate(d.dateCreated)}${d.creator ? ` · ${d.creator}` : ''}`} plain />}
          {d?.comment && <KV k={tr('general.comment')} v={<Linkified text={d.comment} />} plain />}
        </Group>
        <Group title={tr('general.locationTime')}>
          <KV k={tr('general.location')} v={t.downloadDir} />
          <KV k={tr('general.added')} v={formatDate(t.addedDate)} plain />
          <KV k={tr('general.completed')} v={formatDate(t.doneDate)} plain />
          <KV k={tr('general.lastActivity')} v={formatDate(t.activityDate)} plain />
          {d && <KV k={tr('general.downloading')} v={formatDuration(d.secondsDownloading)} />}
          {d && <KV k={tr('general.seeding')} v={formatDuration(d.secondsSeeding)} />}
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[11px] font-medium tracking-wide text-subtle uppercase">{title}</div>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function KV({ k, v, plain }: { k: string; v: ReactNode; plain?: boolean }) {
  return (
    <div className="flex min-w-0 gap-3 text-xs leading-5">
      <dt className="w-28 shrink-0 text-muted">{k}</dt>
      <dd className={`min-w-0 flex-1 truncate ${plain ? '' : 'num'}`}>{v}</dd>
    </div>
  );
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <span title={text}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

/** Draws the piece bitfield, binned to the canvas width. */
function PiecesBar({ pieces, count, done }: { pieces: string; count: number; done: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const styles = getComputedStyle(canvas);
    const on = styles.getPropertyValue('--chart-down').trim() || '#38bdf8';
    const complete = styles.getPropertyValue('--chart-up').trim() || '#34d399';
    if (!count) return;
    if (done) {
      ctx.fillStyle = complete;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    let bits: Uint8Array;
    try {
      const bin = atob(pieces);
      bits = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } catch {
      return;
    }
    const bins = Math.max(1, Math.floor(w));
    const per = count / bins;
    ctx.fillStyle = on;
    for (let b = 0; b < bins; b++) {
      const from = Math.floor(b * per);
      const to = Math.max(from + 1, Math.floor((b + 1) * per));
      let have = 0;
      for (let i = from; i < to && i < count; i++) if ((bits[i >> 3] ?? 0) & (0x80 >> (i & 7))) have++;
      const frac = have / (to - from);
      if (frac > 0) {
        ctx.globalAlpha = 0.25 + frac * 0.75;
        ctx.fillRect(b, 0, 1, h);
      }
    }
  }, [pieces, count, done]);

  return <canvas ref={ref} className="block h-3 w-full overflow-hidden rounded-[3px] bg-surface-3" aria-label={useT()('general.piecesLabel')} />;
}
