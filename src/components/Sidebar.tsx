import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CirclePause,
  Globe,
  HardDrive,
  Layers,
  RefreshCw,
  Sprout,
  Tag,
  Turtle,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useFreeSpace, useSession, useStats, useTorrents } from '../hooks/queries';
import { formatBytes, formatSpeed } from '../lib/format';
import { FILTERS, trackerDomain, type FilterId } from '../lib/status';
import { useConnection } from '../lib/rpc/connection';
import { cn } from '../lib/cn';
import { useSpeed, useUi } from '../store/ui';
import { SpeedChart } from './ui/speed-chart';
import { useT } from '../i18n';

const FILTER_ICONS: Record<FilterId, ReactNode> = {
  all: <Layers />,
  downloading: <ArrowDown />,
  seeding: <Sprout />,
  active: <Activity />,
  paused: <CirclePause />,
  checking: <RefreshCw />,
  error: <AlertTriangle />,
};

export function Sidebar() {
  const { data: torrents = [] } = useTorrents();
  const filter = useUi((s) => s.filter);
  const label = useUi((s) => s.label);
  const tracker = useUi((s) => s.tracker);
  const { setFilter, setLabel, setTracker } = useUi.getState();
  const t = useT();

  const counts = useMemo(() => {
    const status = Object.fromEntries(FILTERS.map((f) => [f.id, 0])) as Record<FilterId, number>;
    const labels = new Map<string, number>();
    const trackers = new Map<string, number>();
    for (const row of torrents) {
      for (const f of FILTERS) if (f.match(row)) status[f.id]++;
      for (const l of row.labels) labels.set(l, (labels.get(l) ?? 0) + 1);
      const seen = new Set<string>();
      for (const tr of row.trackers) {
        const d = trackerDomain(tr.announce);
        if (seen.has(d)) continue;
        seen.add(d);
        trackers.set(d, (trackers.get(d) ?? 0) + 1);
      }
    }
    const sortEntries = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { status, labels: sortEntries(labels), trackers: sortEntries(trackers) };
  }, [torrents]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface-1">
      <Brand />
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pt-1 pb-4">
        <div className="space-y-px">
          {FILTERS.map((f) => (
            <NavItem
              key={f.id}
              icon={FILTER_ICONS[f.id]}
              label={t(f.label)}
              count={counts.status[f.id]}
              active={filter === f.id}
              tone={f.id === 'error' && counts.status.error > 0 ? 'error' : undefined}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </div>

        {counts.labels.length > 0 && (
          <Section title={t('sidebar.labels')}>
            {counts.labels.map(([l, n]) => (
              <NavItem key={l} icon={<Tag />} label={l} count={n} active={label === l} onClick={() => setLabel(label === l ? null : l)} />
            ))}
          </Section>
        )}

        {counts.trackers.length > 0 && (
          <Section title={t('sidebar.trackers')}>
            {counts.trackers.map(([d, n]) => (
              <NavItem
                key={d}
                icon={<Favicon domain={d} />}
                label={d}
                count={n}
                active={tracker === d}
                onClick={() => setTracker(tracker === d ? null : d)}
              />
            ))}
          </Section>
        )}
      </nav>
      <BandwidthPanel />
    </aside>
  );
}

function Brand() {
  const t = useT();
  const mode = useConnection((s) => s.mode);
  const { data: session } = useSession();
  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 px-4">
      <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-sky-600 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]">
        <ArrowDown className="size-3.5 text-white" strokeWidth={2.75} />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[13px] font-semibold tracking-tight">Tributary</div>
        <div className="num truncate text-[10px] text-subtle">{session ? `Transmission ${session.version.split(' ')[0]}` : '…'}</div>
      </div>
      {mode === 'demo' && <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-500 ring-1 ring-violet-500/20 ring-inset">{t('sidebar.demo')}</span>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="group flex w-full items-center gap-1 px-2 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase hover:text-muted">
        {title}
        <ChevronDown className={cn('size-3 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="space-y-px">{children}</div>}
    </div>
  );
}

function NavItem({ icon, label, count, active, tone, onClick }: { icon: ReactNode; label: string; count: number; active: boolean; tone?: 'error'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex h-7 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
        active ? 'bg-surface-3/80 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <span className={cn('flex w-3.5 justify-center', active ? 'text-accent' : 'text-subtle group-hover:text-muted', tone === 'error' && 'text-rose-500')}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className={cn('num text-[11px]', tone === 'error' ? 'text-rose-500' : 'text-subtle')}>{count.toLocaleString()}</span>
    </button>
  );
}

function Favicon({ domain }: { domain: string }) {
  // No external requests: a deterministic coloured initial instead of a fetched favicon.
  const hue = [...domain].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  return domain ? (
    <span className="flex size-3.5 items-center justify-center rounded-[3px] text-[8px] font-bold text-white uppercase" style={{ background: `hsl(${hue} 55% 48%)` }}>
      {domain[0]}
    </span>
  ) : (
    <Globe />
  );
}

function BandwidthPanel() {
  const t = useT();
  const { data: stats } = useStats();
  const { data: session } = useSession();
  const { data: free } = useFreeSpace(session?.['download-dir']);
  const samples = useSpeed((s) => s.global);
  const turtle = session?.['alt-speed-enabled'] ?? false;

  const total = free?.total_size ?? 0;
  const freeBytes = free?.['size-bytes'] ?? 0;
  const usedPct = total > 0 ? 1 - freeBytes / total : 0;

  return (
    <div className="shrink-0 space-y-3 border-t border-line px-3 pt-3 pb-3">
      <div className="flex items-end justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[12px]">
            <ArrowDown className="size-3 text-chart-down" strokeWidth={2.5} />
            <span className="num font-medium">{formatSpeed(stats?.downloadSpeed ?? 0, '0 B/s')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px]">
            <ArrowUp className="size-3 text-chart-up" strokeWidth={2.5} />
            <span className="num font-medium">{formatSpeed(stats?.uploadSpeed ?? 0, '0 B/s')}</span>
          </div>
        </div>
        {turtle && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 ring-1 ring-amber-500/20 ring-inset">
            <Turtle className="size-3" /> {session?.['alt-speed-down']} kB/s
          </span>
        )}
      </div>
      <SpeedChart samples={samples} height={44} span={60} className="-mx-1" />
      {free && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <HardDrive className="size-3" />
            <span className="num">{t('sidebar.free', { size: formatBytes(freeBytes) })}</span>
            {total > 0 && <span className="num ml-auto text-subtle">{t('sidebar.ofTotal', { size: formatBytes(total, 1) })}</span>}
          </div>
          {total > 0 && (
            <div className="h-1 overflow-hidden rounded-full bg-surface-3">
              <div className={cn('h-full rounded-full', usedPct > 0.9 ? 'bg-rose-500' : usedPct > 0.75 ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-500')} style={{ width: `${usedPct * 100}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
