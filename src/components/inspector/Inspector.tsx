import * as Tabs from '@radix-ui/react-tabs';
import { Activity, FileStack, Info, Radio, Users, X } from 'lucide-react';
import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useTorrentDetail, useTorrents } from '../../hooks/queries';
import { torrentCache } from '../../lib/torrent-cache';
import { formatBytes, formatNumber, formatSpeed } from '../../lib/format';
import { cn } from '../../lib/cn';
import { useUi, type InspectorTab } from '../../store/ui';
import { GeneralTab } from './GeneralTab';
import { FilesTab } from './FilesTab';
import { PeersTab } from './PeersTab';
import { TrackersTab } from './TrackersTab';
import { SpeedTab } from './SpeedTab';
import { Button } from '../ui/button';
import { useT, type MessageKey } from '../../i18n';

const TABS: ReadonlyArray<{ id: InspectorTab; label: MessageKey; icon: ReactNode }> = [
  { id: 'general', label: 'inspector.general', icon: <Info /> },
  { id: 'files', label: 'inspector.files', icon: <FileStack /> },
  { id: 'peers', label: 'inspector.peers', icon: <Users /> },
  { id: 'trackers', label: 'inspector.trackers', icon: <Radio /> },
  { id: 'speed', label: 'inspector.speed', icon: <Activity /> },
];

export function Inspector() {
  const t = useT();
  const open = useUi((s) => s.inspectorOpen);
  const height = useUi((s) => s.inspectorHeight);
  const tab = useUi((s) => s.inspectorTab);
  const focused = useUi((s) => s.focused);
  const selected = useUi((s) => s.selected);
  const ui = useUi.getState();
  useTorrents(); // re-render on every poll so the summary row stays live

  const id = focused !== null && selected.has(focused) ? focused : selected.size === 1 ? [...selected][0]! : null;
  const row = id !== null ? torrentCache.get(id) : undefined;
  const { data: detail } = useTorrentDetail(row ? id : null);

  const startDrag = useResize(height, ui.setInspectorHeight);

  if (!open) return null;

  return (
    <section className="relative flex shrink-0 flex-col border-t border-line bg-surface-1" style={{ height }}>
      <div onPointerDown={startDrag} className="absolute -top-[3px] right-0 left-0 z-10 h-[6px] cursor-row-resize hover:bg-accent/30 active:bg-accent/50" />
      <Tabs.Root value={tab} onValueChange={(v) => ui.setInspectorTab(v as InspectorTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line pr-2 pl-2">
          <Tabs.List className="flex items-center gap-0.5">
            {TABS.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted transition-colors hover:text-fg [&_svg]:size-3.5',
                  'data-[state=active]:bg-surface-3/80 data-[state=active]:text-fg',
                )}
              >
                {tab.icon}
                {t(tab.label)}
                {tab.id === 'peers' && row && row.peersConnected > 0 && <span className="num text-[10px] text-subtle">{row.peersConnected}</span>}
                {tab.id === 'files' && detail && detail.files.length > 1 && <span className="num text-[10px] text-subtle">{detail.files.length}</span>}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <div className="min-w-0 flex-1 truncate text-right text-xs text-muted">{row ? row.name : selected.size > 1 ? t('inspector.nSelected', { count: selected.size }) : ''}</div>
          <Button variant="ghost" size="icon-sm" onClick={() => ui.setInspectorOpen(false)} aria-label={t('inspector.close')}>
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          {!row ? (
            selected.size > 1 ? (
              <MultiSummary ids={[...selected]} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-subtle">{t('inspector.empty')}</div>
            )
          ) : (
            <>
              <Tabs.Content value="general" className="h-full overflow-y-auto outline-none">
                <GeneralTab row={row} detail={detail ?? null} />
              </Tabs.Content>
              <Tabs.Content value="files" className="h-full outline-none">
                <FilesTab row={row} detail={detail ?? null} />
              </Tabs.Content>
              <Tabs.Content value="peers" className="h-full outline-none">
                <PeersTab detail={detail ?? null} />
              </Tabs.Content>
              <Tabs.Content value="trackers" className="h-full overflow-y-auto outline-none">
                <TrackersTab detail={detail ?? null} />
              </Tabs.Content>
              <Tabs.Content value="speed" className="h-full outline-none">
                <SpeedTab row={row} height={height - 36} />
              </Tabs.Content>
            </>
          )}
        </div>
      </Tabs.Root>
    </section>
  );
}

function MultiSummary({ ids }: { ids: number[] }) {
  const t = useT();
  const rows = ids.map((id) => torrentCache.get(id)).filter((r) => r !== undefined);
  const size = rows.reduce((a, r) => a + r.sizeWhenDone, 0);
  const left = rows.reduce((a, r) => a + r.leftUntilDone, 0);
  const down = rows.reduce((a, r) => a + r.rateDownload, 0);
  const up = rows.reduce((a, r) => a + r.rateUpload, 0);
  const uploaded = rows.reduce((a, r) => a + r.uploadedEver, 0);
  const items: Array<[string, string]> = [
    [t('inspector.sumTorrents'), formatNumber(rows.length)],
    [t('inspector.sumSize'), formatBytes(size)],
    [t('inspector.sumRemaining'), formatBytes(left)],
    [t('inspector.sumDownload'), formatSpeed(down, '0 B/s')],
    [t('inspector.sumUpload'), formatSpeed(up, '0 B/s')],
    [t('inspector.sumUploaded'), formatBytes(uploaded)],
  ];
  return (
    <div className="grid grid-cols-3 gap-px p-4 sm:grid-cols-6">
      {items.map(([k, v]) => (
        <div key={k} className="px-2">
          <div className="text-[11px] text-subtle">{k}</div>
          <div className="num mt-0.5 text-[15px] font-medium">{v}</div>
        </div>
      ))}
    </div>
  );
}

function useResize(height: number, set: (h: number) => void) {
  const start = useRef<{ y: number; h: number } | null>(null);
  return useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      start.current = { y: e.clientY, h: height };
      const move = (ev: PointerEvent) => {
        if (!start.current) return;
        const next = start.current.h - (ev.clientY - start.current.y);
        set(Math.round(Math.max(150, Math.min(window.innerHeight - 220, next))));
      };
      const up = () => {
        start.current = null;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.cursor = '';
      };
      document.body.style.cursor = 'row-resize';
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [height, set],
  );
}
