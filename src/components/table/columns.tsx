import { createColumnHelper } from '@tanstack/react-table';
import { AlertCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { TorrentStatus, type TorrentRow } from '../../lib/rpc/types';
import { formatBytes, formatDate, formatEta, formatPercent, formatRatio, formatRelative, formatShortDate, formatSpeed } from '../../lib/format';
import { primaryTracker, statusInfo, statusRank } from '../../lib/status';
import { cn } from '../../lib/cn';
import { Chip, Pill, ProgressBar } from '../ui/misc';
import { t as tr, type MessageKey } from '../../i18n';

const h = createColumnHelper<TorrentRow>();
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const COLUMN_KEYS = {
  name: 'columns.name',
  status: 'columns.status',
  progress: 'columns.progress',
  size: 'columns.size',
  rateDownload: 'columns.down',
  rateUpload: 'columns.up',
  eta: 'columns.eta',
  ratio: 'columns.ratio',
  peers: 'columns.peers',
  addedDate: 'columns.added',
  doneDate: 'columns.completed',
  downloadedEver: 'columns.downloaded',
  uploadedEver: 'columns.uploaded',
  queuePosition: 'columns.queue',
  downloadDir: 'columns.location',
  tracker: 'columns.tracker',
} as const satisfies Record<string, MessageKey>;

export type ColumnId = keyof typeof COLUMN_KEYS;

/** Header renderer that re-evaluates on every render, so it follows the active language. */
const head = (id: ColumnId) => () => tr(COLUMN_KEYS[id]);

export const RIGHT_ALIGNED: ReadonlySet<string> = new Set<ColumnId>([
  'size',
  'rateDownload',
  'rateUpload',
  'eta',
  'ratio',
  'peers',
  'downloadedEver',
  'uploadedEver',
  'queuePosition',
]);

const dim = (zero: boolean) => (zero ? 'text-subtle/70' : 'text-fg');

function progressOf(t: TorrentRow): { value: number; label: string } {
  if (t.status === TorrentStatus.Check) return { value: t.recheckProgress, label: formatPercent(t.recheckProgress) };
  if (t.metadataPercentComplete < 1) return { value: t.metadataPercentComplete, label: formatPercent(t.metadataPercentComplete) };
  return { value: t.percentDone, label: formatPercent(t.percentDone) };
}

// Left un-annotated: each accessor keeps its own precise value type, and the
// union array is accepted by useReactTable as-is.
export const columns = [
  h.accessor('name', {
    id: 'name',
    header: head('name'),
    size: 400,
    minSize: 160,
    sortingFn: (a, b) => collator.compare(a.original.name, b.original.name),
    cell: ({ row: { original: t } }) => (
      <div className="flex min-w-0 items-center gap-2">
        {t.error !== 0 && <AlertCircle className="size-3.5 shrink-0 text-rose-500" aria-label={t.errorString} />}
        <span className="truncate" title={t.error ? `${t.name}\n\n${t.errorString}` : t.name}>
          {t.name}
        </span>
        {t.labels.length > 0 && (
          <span className="flex shrink-0 gap-1">
            {t.labels.slice(0, 3).map((l) => (
              <Chip key={l}>{l}</Chip>
            ))}
          </span>
        )}
      </div>
    ),
  }),
  h.accessor((t) => statusRank(t), {
    id: 'status',
    header: head('status'),
    size: 128,
    minSize: 90,
    sortDescFirst: false,
    cell: ({ row: { original: t } }) => {
      const s = statusInfo(t);
      return <Pill tone={s.tone} pulse={t.status === TorrentStatus.Check || t.metadataPercentComplete < 1}>{s.label}</Pill>;
    },
  }),
  h.accessor('percentDone', {
    id: 'progress',
    header: head('progress'),
    size: 156,
    minSize: 90,
    cell: ({ row: { original: t } }) => {
      const p = progressOf(t);
      const s = statusInfo(t);
      const tone = t.status === TorrentStatus.Stopped && p.value < 1 ? 'zinc' : p.value >= 1 && s.tone === 'zinc' ? 'emerald' : s.tone;
      return (
        <div className="flex w-full items-center gap-2">
          <ProgressBar value={p.value} tone={tone} striped={t.rateDownload > 0} className="flex-1" />
          <span className="num w-11 text-right text-[11px] text-muted">{p.label}</span>
        </div>
      );
    },
  }),
  h.accessor('sizeWhenDone', {
    id: 'size',
    header: head('size'),
    size: 92,
    minSize: 64,
    cell: ({ row: { original: t } }) => (
      <span className="num" title={t.sizeWhenDone < t.totalSize ? tr('table.sizeSelected', { selected: formatBytes(t.sizeWhenDone), total: formatBytes(t.totalSize) }) : undefined}>
        {t.totalSize === 0 ? '—' : formatBytes(t.sizeWhenDone)}
      </span>
    ),
  }),
  h.accessor('rateDownload', {
    id: 'rateDownload',
    header: () => (
      <span className="inline-flex items-center gap-1">
        <ArrowDown className="size-3 text-chart-down" /> {tr('columns.down')}
      </span>
    ),
    size: 96,
    minSize: 64,
    cell: ({ getValue }) => <span className={cn('num', dim(!getValue()))}>{formatSpeed(getValue())}</span>,
  }),
  h.accessor('rateUpload', {
    id: 'rateUpload',
    header: () => (
      <span className="inline-flex items-center gap-1">
        <ArrowUp className="size-3 text-chart-up" /> {tr('columns.up')}
      </span>
    ),
    size: 96,
    minSize: 64,
    cell: ({ getValue }) => <span className={cn('num', dim(!getValue()))}>{formatSpeed(getValue())}</span>,
  }),
  h.accessor((t) => (t.eta < 0 ? Number.MAX_SAFE_INTEGER + t.eta : t.eta), {
    id: 'eta',
    header: head('eta'),
    size: 84,
    minSize: 56,
    sortDescFirst: false,
    cell: ({ row: { original: t } }) => {
      const show = t.status === TorrentStatus.Download && t.eta !== -1;
      return <span className={cn('num', dim(!show))}>{show ? formatEta(t.eta) : '—'}</span>;
    },
  }),
  h.accessor('uploadRatio', {
    id: 'ratio',
    header: head('ratio'),
    size: 68,
    minSize: 52,
    cell: ({ getValue }) => {
      const r = getValue();
      return <span className={cn('num', r >= 1 ? 'text-emerald-600 dark:text-emerald-400' : r <= 0 ? 'text-subtle/70' : 'text-fg')}>{formatRatio(r)}</span>;
    },
  }),
  h.accessor('peersConnected', {
    id: 'peers',
    header: head('peers'),
    size: 72,
    minSize: 52,
    cell: ({ row: { original: t } }) => (
      <span className={cn('num', dim(!t.peersConnected))} title={tr('table.peersTitle', { sending: t.peersSendingToUs, getting: t.peersGettingFromUs })}>
        {t.peersConnected || '—'}
      </span>
    ),
  }),
  h.accessor('addedDate', {
    id: 'addedDate',
    header: head('addedDate'),
    size: 104,
    minSize: 70,
    cell: ({ getValue }) => (
      <span className="text-muted" title={formatDate(getValue())}>
        {formatRelative(getValue())}
      </span>
    ),
  }),
  h.accessor('doneDate', {
    id: 'doneDate',
    header: head('doneDate'),
    size: 110,
    minSize: 70,
    cell: ({ getValue }) => (
      <span className="text-muted" title={formatDate(getValue())}>
        {formatShortDate(getValue())}
      </span>
    ),
  }),
  h.accessor('downloadedEver', {
    id: 'downloadedEver',
    header: head('downloadedEver'),
    size: 100,
    minSize: 64,
    cell: ({ getValue }) => <span className="num">{formatBytes(getValue())}</span>,
  }),
  h.accessor('uploadedEver', {
    id: 'uploadedEver',
    header: head('uploadedEver'),
    size: 100,
    minSize: 64,
    cell: ({ getValue }) => <span className="num">{formatBytes(getValue())}</span>,
  }),
  h.accessor('queuePosition', {
    id: 'queuePosition',
    header: head('queuePosition'),
    size: 72,
    minSize: 48,
    sortDescFirst: false,
    cell: ({ getValue }) => <span className="num text-muted">{getValue() + 1}</span>,
  }),
  h.accessor('downloadDir', {
    id: 'downloadDir',
    header: head('downloadDir'),
    size: 180,
    minSize: 80,
    sortingFn: (a, b) => collator.compare(a.original.downloadDir, b.original.downloadDir),
    cell: ({ getValue }) => <span className="num truncate text-[12px] text-muted">{getValue()}</span>,
  }),
  h.accessor((t) => primaryTracker(t), {
    id: 'tracker',
    header: head('tracker'),
    size: 140,
    minSize: 80,
    cell: ({ getValue }) => <span className="truncate text-muted">{getValue()}</span>,
  }),
];
