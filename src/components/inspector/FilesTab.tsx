import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronRight,
  Disc3,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTorrentActions } from '../../hooks/actions';
import { Priority, type TorrentDetail, type TorrentRow } from '../../lib/rpc/types';
import { formatBytes, formatPercent } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Checkbox, ProgressBar } from '../ui/misc';
import { useT, type MessageKey } from '../../i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/menu';

interface Node {
  name: string;
  path: string;
  depth: number;
  isDir: boolean;
  children: Node[];
  indices: number[];
  length: number;
  done: number;
  wanted: boolean | 'mixed';
  priority: Priority | 'mixed';
}

type Override = Map<number, { wanted?: boolean; priority?: Priority }>;

function buildTree(d: TorrentDetail, override: Override): Node[] {
  const root: Node = { name: '', path: '', depth: -1, isDir: true, children: [], indices: [], length: 0, done: 0, wanted: true, priority: Priority.Normal };
  const dirs = new Map<string, Node>([['', root]]);

  d.files.forEach((f, i) => {
    const parts = f.name.split('/');
    let parent = root;
    let path = '';
    for (let p = 0; p < parts.length - 1; p++) {
      path = path ? `${path}/${parts[p]}` : parts[p]!;
      let dir = dirs.get(path);
      if (!dir) {
        dir = { name: parts[p]!, path, depth: p, isDir: true, children: [], indices: [], length: 0, done: 0, wanted: true, priority: Priority.Normal };
        dirs.set(path, dir);
        parent.children.push(dir);
      }
      parent = dir;
    }
    const st = d.fileStats[i];
    const ov = override.get(i);
    parent.children.push({
      name: parts[parts.length - 1]!,
      path: f.name,
      depth: parts.length - 1,
      isDir: false,
      children: [],
      indices: [i],
      length: f.length,
      done: f.bytesCompleted,
      wanted: ov?.wanted ?? st?.wanted ?? true,
      priority: ov?.priority ?? st?.priority ?? Priority.Normal,
    });
  });

  const aggregate = (n: Node): void => {
    if (!n.isDir) return;
    n.children.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    let wanted: Node['wanted'] | null = null;
    let prio: Node['priority'] | null = null;
    for (const c of n.children) {
      aggregate(c);
      n.indices.push(...c.indices);
      n.length += c.length;
      n.done += c.done;
      wanted = wanted === null ? c.wanted : wanted === c.wanted ? wanted : 'mixed';
      prio = prio === null ? c.priority : prio === c.priority ? prio : 'mixed';
    }
    n.wanted = wanted ?? true;
    n.priority = prio ?? Priority.Normal;
  };
  aggregate(root);
  return root.children;
}

function flatten(nodes: Node[], expanded: ReadonlySet<string>, out: Node[] = []): Node[] {
  for (const n of nodes) {
    out.push(n);
    if (n.isDir && expanded.has(n.path)) flatten(n.children, expanded, out);
  }
  return out;
}

function iconFor(name: string, isDir: boolean, open: boolean): ReactNode {
  if (isDir) return open ? <FolderOpen className="text-sky-500" /> : <Folder className="text-sky-500" />;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['mkv', 'mp4', 'avi', 'mov', 'webm', 'm4v'].includes(ext)) return <FileVideo className="text-violet-500" />;
  if (['flac', 'mp3', 'ogg', 'wav', 'm4a', 'opus'].includes(ext)) return <FileAudio className="text-pink-500" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FileImage className="text-amber-500" />;
  if (['zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'zst', 'parquet', 'pbf'].includes(ext)) return <FileArchive className="text-orange-500" />;
  if (['iso', 'img', 'dmg'].includes(ext)) return <Disc3 className="text-emerald-500" />;
  if (['txt', 'srt', 'nfo', 'md', 'tsv', 'csv', 'json', 'sha256'].includes(ext) || name === 'LICENSE') return <FileText className="text-zinc-400" />;
  return <File className="text-zinc-400" />;
}

const PRIO_LABEL: Record<string, MessageKey> = { '1': 'files.high', '0': 'files.normal', '-1': 'files.low', mixed: 'files.mixed' };

export function FilesTab({ row, detail }: { row: TorrentRow; detail: TorrentDetail | null }) {
  const t = useT();
  const actions = useTorrentActions();
  const [override, setOverride] = useState<Override>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const initFor = useRef<number | null>(null);

  // Drop optimistic overrides once fresh data arrives.
  useEffect(() => setOverride(new Map()), [detail?.fileStats]);

  const tree = useMemo(() => (detail ? buildTree(detail, override) : []), [detail, override]);

  // Expand top-level folders when switching torrents.
  useEffect(() => {
    if (!detail || initFor.current === detail.id) return;
    initFor.current = detail.id;
    setExpanded(new Set(tree.filter((n) => n.isDir).map((n) => n.path)));
  }, [detail, tree]);

  const flat = useMemo(() => flatten(tree, expanded), [tree, expanded]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: flat.length, getScrollElement: () => scrollRef.current, estimateSize: () => 30, overscan: 10 });

  if (!detail) return <div className="flex h-full items-center justify-center text-xs text-subtle">{t('files.loading')}</div>;
  if (detail.files.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-subtle">{row.metadataPercentComplete < 1 ? t('files.waitingMetadata') : t('files.none')}</div>;
  }

  const applyWanted = (n: Node, wanted: boolean) => {
    setOverride((o) => {
      const m = new Map(o);
      for (const i of n.indices) m.set(i, { ...m.get(i), wanted });
      return m;
    });
    void actions.setFilesWanted(detail.id, n.indices, wanted);
  };
  const applyPriority = (n: Node, priority: Priority) => {
    setOverride((o) => {
      const m = new Map(o);
      for (const i of n.indices) m.set(i, { ...m.get(i), priority });
      return m;
    });
    void actions.setFilesPriority(detail.id, n.indices, priority);
  };
  const toggle = (path: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 shrink-0 items-center border-b border-line pr-3 pl-3 text-[11px] font-medium text-subtle">
        <span className="flex-1">{t('files.name')}</span>
        <span className="w-20 text-right">{t('files.size')}</span>
        <span className="w-36 pl-4">{t('files.progress')}</span>
        <span className="w-20">{t('files.priority')}</span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div style={{ height: v.getTotalSize() }} className="relative">
          {v.getVirtualItems().map((vi) => {
            const n = flat[vi.index]!;
            const open = expanded.has(n.path);
            const pct = n.length ? n.done / n.length : 1;
            return (
              <div
                key={n.path}
                className={cn('absolute inset-x-0 flex items-center pr-3 text-xs hover:bg-surface-2/70', n.wanted === false && 'opacity-50')}
                style={{ height: 30, transform: `translateY(${vi.start}px)` }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5" style={{ paddingLeft: 8 + n.depth * 18 }}>
                  <button
                    className={cn('flex size-4 items-center justify-center text-subtle hover:text-fg', !n.isDir && 'invisible')}
                    onClick={() => toggle(n.path)}
                    aria-label={open ? t('files.collapse') : t('files.expand')}
                  >
                    <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
                  </button>
                  <Checkbox checked={n.wanted} onChange={(w) => applyWanted(n, n.wanted === 'mixed' ? true : w)} label={t('files.download', { name: n.name })} />
                  <span className="flex size-4 shrink-0 items-center [&_svg]:size-3.5">{iconFor(n.name, n.isDir, open)}</span>
                  <span className={cn('truncate', n.isDir && 'cursor-pointer font-medium')} onClick={n.isDir ? () => toggle(n.path) : undefined} title={n.path}>
                    {n.name}
                  </span>
                  {n.isDir && <span className="num shrink-0 text-[10px] text-subtle">{n.indices.length}</span>}
                </div>
                <span className="num w-20 shrink-0 text-right text-muted">{formatBytes(n.length)}</span>
                <div className="flex w-36 shrink-0 items-center gap-2 pl-4">
                  <ProgressBar value={pct} tone={pct >= 1 ? 'emerald' : 'sky'} className="flex-1" />
                  <span className="num w-10 text-right text-[10.5px] text-muted">{formatPercent(pct)}</span>
                </div>
                <div className="w-20 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] hover:bg-surface-3',
                        n.priority === Priority.High ? 'text-amber-500' : n.priority === Priority.Low ? 'text-subtle' : 'text-muted',
                      )}
                    >
                      {t(PRIO_LABEL[String(n.priority)] ?? 'files.normal')}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[120px]">
                      <DropdownMenuRadioGroup value={String(n.priority)} onValueChange={(val) => applyPriority(n, Number(val) as Priority)}>
                        <DropdownMenuRadioItem value="1">{t('files.high')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0">{t('files.normal')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="-1">{t('files.low')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
