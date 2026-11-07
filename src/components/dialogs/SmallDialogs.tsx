import { AlertTriangle, Tag, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTorrentActions } from '../../hooks/actions';
import { useTorrents } from '../../hooks/queries';
import { torrentCache } from '../../lib/torrent-cache';
import { formatBytes } from '../../lib/format';
import { useT, type MessageKey } from '../../i18n';
import { useUi } from '../../store/ui';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Checkbox, Field, Input, Kbd } from '../ui/misc';

const rowsFor = (ids: number[]) => ids.map((id) => torrentCache.get(id)).filter((r) => r !== undefined);

/* ----------------------------------------------------------------- remove */

export function RemoveDialog({ ids, deleteData: initialDelete }: { ids: number[]; deleteData: boolean }) {
  const t = useT();
  const ui = useUi.getState();
  const actions = useTorrentActions();
  const [del, setDel] = useState(initialDelete);
  const rows = rowsFor(ids);
  const size = rows.reduce((a, r) => a + (r.sizeWhenDone - r.leftUntilDone), 0);
  const confirm = () => {
    void actions.remove(ids, del);
    ui.closeDialog();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && ui.closeDialog()}
      title={t('remove.title', { count: rows.length })}
      footer={
        <>
          <Button variant="ghost" onClick={ui.closeDialog}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirm} autoFocus>
            {del ? t('remove.confirmDelete') : t('remove.confirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-line bg-surface-1 p-2 text-xs">
          {rows.slice(0, 50).map((r) => (
            <li key={r.id} className="truncate">
              {r.name}
            </li>
          ))}
          {rows.length > 50 && <li className="text-subtle">{t('remove.more', { count: rows.length - 50 })}</li>}
        </ul>
        <div className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line px-3 py-2.5" onClick={() => setDel(!del)}>
          <Checkbox checked={del} onChange={setDel} className="mt-0.5" label={t('remove.deleteData')} />
          <span>
            <span className="block text-[13px]">{t('remove.deleteData')}</span>
            <span className="num block text-[11px] text-subtle">{t('remove.deleteHint', { size: formatBytes(size) })}</span>
          </span>
        </div>
        {del && (
          <div className="flex items-center gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-3.5 shrink-0" /> {t('remove.undone')}
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- labels */

export function LabelsDialog({ ids }: { ids: number[] }) {
  const t = useT();
  const ui = useUi.getState();
  const actions = useTorrentActions();
  const { data: all = [] } = useTorrents();
  const rows = rowsFor(ids);
  // Start with labels common to every selected torrent.
  const [labels, setLabels] = useState<string[]>(() => {
    const first = rows[0]?.labels ?? [];
    return first.filter((l) => rows.every((r) => r.labels.includes(l)));
  });
  const [draft, setDraft] = useState('');
  const known = useMemo(() => [...new Set(all.flatMap((r) => r.labels))].sort(), [all]);
  const suggestions = known.filter((l) => !labels.includes(l) && l.toLowerCase().includes(draft.toLowerCase()));

  const add = (l: string) => {
    const v = l.trim().replace(/,/g, '');
    if (v && !labels.includes(v)) setLabels([...labels, v]);
    setDraft('');
  };
  const save = () => {
    const final = draft.trim() ? [...labels, draft.trim()] : labels;
    void actions.setLabels(ids, final);
    ui.closeDialog();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && ui.closeDialog()}
      title={t('labels.title')}
      description={rows.length === 1 ? rows[0]?.name : t('labels.manyHint', { count: rows.length })}
      footer={
        <>
          <Button variant="ghost" onClick={ui.closeDialog}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={save}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface-1 px-2 py-1.5 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
          {labels.map((l) => (
            <span key={l} className="inline-flex h-6 items-center gap-1 rounded-md bg-accent-soft pr-1 pl-2 text-xs text-accent">
              {l}
              <button onClick={() => setLabels(labels.filter((x) => x !== l))} className="rounded p-0.5 hover:bg-accent/20" aria-label={t('labels.removeLabel', { label: l })}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                if (draft.trim()) add(draft);
                else if (e.key === 'Enter') save();
              } else if (e.key === 'Backspace' && !draft && labels.length) {
                setLabels(labels.slice(0, -1));
              }
            }}
            placeholder={labels.length ? '' : t('labels.placeholder')}
            className="h-6 min-w-24 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle focus-visible:outline-none"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 16).map((l) => (
              <button key={l} onClick={() => add(l)} className="inline-flex h-6 items-center gap-1 rounded-md border border-line px-2 text-xs text-muted hover:bg-surface-2 hover:text-fg">
                <Tag className="size-3" /> {l}
              </button>
            ))}
          </div>
        )}
        <div className="text-[11px] text-subtle">
          <Kbd>Enter</Kbd> {t('labels.hintAdd')} · <Kbd>⌫</Kbd> {t('labels.hintRemove')}
        </div>
      </div>
    </Dialog>
  );
}

/* --------------------------------------------------------------- location */

export function LocationDialog({ ids }: { ids: number[] }) {
  const t = useT();
  const ui = useUi.getState();
  const actions = useTorrentActions();
  const rows = rowsFor(ids);
  const [path, setPath] = useState(rows[0]?.downloadDir ?? '');
  const [move, setMove] = useState(true);
  const save = () => {
    if (!path.trim()) return;
    void actions.setLocation(ids, path.trim(), move);
    ui.closeDialog();
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && ui.closeDialog()}
      title={t('location.title')}
      description={rows.length === 1 ? rows[0]?.name : t('common.torrents', { count: rows.length })}
      footer={
        <>
          <Button variant="ghost" onClick={ui.closeDialog}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={save} disabled={!path.trim()}>
            {move ? t('location.submitMove') : t('location.submitSet')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('location.path')}>
          <Input autoFocus value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className="num text-[12px]" spellCheck={false} />
        </Field>
        <div className="flex cursor-pointer items-start gap-2.5" onClick={() => setMove(!move)}>
          <Checkbox checked={move} onChange={setMove} className="mt-0.5" label={t('location.move')} />
          <span>
            <span className="block text-[13px]">{t('location.move')}</span>
            <span className="block text-[11px] text-subtle">{t('location.moveHint')}</span>
          </span>
        </div>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------- shortcuts */

const SHORTCUTS: ReadonlyArray<[keys: string[], label: MessageKey]> = [
  [['/'], 'shortcuts.search'],
  [['Ctrl/⌘', 'A'], 'shortcuts.selectAll'],
  [['Click', 'Shift', 'Ctrl/⌘'], 'shortcuts.click'],
  [['↑', '↓'], 'shortcuts.move'],
  [['Esc'], 'shortcuts.escape'],
  [['Space'], 'shortcuts.space'],
  [['S', 'P', 'V'], 'shortcuts.spv'],
  [['L'], 'shortcuts.labels'],
  [['Del'], 'shortcuts.remove'],
  [['N'], 'shortcuts.add'],
  [['T'], 'shortcuts.turtle'],
  [['I'], 'shortcuts.inspector'],
  [['['], 'shortcuts.sidebar'],
  [['1', '–', '7'], 'shortcuts.filters'],
  [[','], 'shortcuts.prefs'],
];

export function ShortcutsDialog() {
  const t = useT();
  const ui = useUi.getState();
  return (
    <Dialog open onOpenChange={(o) => !o && ui.closeDialog()} title={t('shortcuts.title')} className="w-[min(92vw,460px)]">
      <dl className="space-y-1.5">
        {SHORTCUTS.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-[13px]">
            <dt className="text-muted">{t(label)}</dt>
            <dd className="flex shrink-0 gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
