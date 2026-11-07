import { FileUp, Link2, Loader2, Magnet, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTorrentActions } from '../../hooks/actions';
import { useSession } from '../../hooks/queries';
import { formatBytes } from '../../lib/format';
import { cn } from '../../lib/cn';
import { useUi } from '../../store/ui';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Switch } from '../ui/misc';
import { useT } from '../../i18n';

/** Read a File as base64 without the data-URL prefix (what `metainfo` expects). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error ?? new Error('read failed'));
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    r.readAsDataURL(file);
  });
}

export const isTorrentFile = (f: File) => f.name.toLowerCase().endsWith('.torrent') || f.type === 'application/x-bittorrent';

export function AddTorrentDialog({ initialFiles, initialMagnet }: { initialFiles: File[]; initialMagnet: string }) {
  const t = useT();
  const ui = useUi.getState();
  const actions = useTorrentActions();
  const { data: session } = useSession();
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [links, setLinks] = useState(initialMagnet);
  const [dir, setDir] = useState('');
  const [labels, setLabels] = useState('');
  const [start, setStart] = useState(true);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      setDir((d) => d || session['download-dir']);
      setStart(session['start-added-torrents']);
    }
  }, [session]);

  const linkList = links
    .split(/\s+/)
    .map((l) => l.trim())
    .filter((l) => /^(magnet:\?|https?:\/\/|[a-f0-9]{40}$)/i.test(l));
  const total = files.length + linkList.length;

  const addFiles = (list: FileList | File[]) => {
    const next = [...list].filter(isTorrentFile);
    setFiles((f) => [...f, ...next.filter((n) => !f.some((x) => x.name === n.name && x.size === n.size))]);
  };

  const submit = async () => {
    setBusy(true);
    const labelList = labels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const base = {
      'download-dir': dir || undefined,
      paused: !start,
      ...(labelList.length ? { labels: labelList } : {}),
    };
    let ok = 0;
    for (const f of files) {
      try {
        const metainfo = await fileToBase64(f);
        if (await actions.add({ ...base, metainfo }, f.name)) ok++;
      } catch {
        /* toast already shown */
      }
    }
    for (const l of linkList) {
      const filename = /^[a-f0-9]{40}$/i.test(l) ? `magnet:?xt=urn:btih:${l}` : l;
      if (await actions.add({ ...base, filename }, t('add.link'))) ok++;
    }
    setBusy(false);
    if (ok === total) ui.closeDialog();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && ui.closeDialog()}
      title={t('add.title')}
      description={t('add.description')}
      className="w-[min(92vw,560px)]"
      footer={
        <>
          <Button variant="ghost" onClick={ui.closeDialog}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={!total || busy} onClick={() => void submit()}>
            {busy && <Loader2 className="animate-spin" />}
            {total > 0 ? t('add.submit', { count: total }) : t('add.submitEmpty')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            addFiles(e.dataTransfer.files);
            const text = e.dataTransfer.getData('text/plain');
            if (text) setLinks((l) => (l ? `${l}\n${text}` : text));
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
            over ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-subtle hover:bg-surface-2/50',
          )}
        >
          <div className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted">
            <FileUp className="size-4" />
          </div>
          <div className="text-[13px]">
            <span className="font-medium text-accent">{t('add.choose')}</span> <span className="text-muted">{t('add.orDrag')}</span>
          </div>
          <input ref={inputRef} type="file" accept=".torrent,application/x-bittorrent" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 py-1.5 text-xs">
                <FileUp className="size-3.5 text-subtle" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="num text-subtle">{formatBytes(f.size)}</span>
                <button className="rounded p-0.5 text-subtle hover:text-fg" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label={t('add.removeFile', { name: f.name })}>
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Field label={<span className="inline-flex items-center gap-1.5"><Magnet className="size-3.5" /> {t('add.links')}</span>}>
          <textarea
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="magnet:?xt=urn:btih:…"
            className="num w-full resize-none rounded-md border border-line bg-surface-1 px-2.5 py-2 text-[12px] text-fg placeholder:text-subtle outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 focus-visible:outline-none"
          />
          {links.trim() && (
            <span className="flex items-center gap-1 text-[11px] text-subtle">
              <Link2 className="size-3" /> {t('add.linksDetected', { count: linkList.length })}
            </span>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
          <Field label={t('add.downloadTo')}>
            <Input value={dir} onChange={(e) => setDir(e.target.value)} className="num text-[12px]" spellCheck={false} />
          </Field>
          <Field label={t('add.labels')} hint={t('add.labelsHint')}>
            <Input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="linux, iso" />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-3 py-2">
          <div>
            <div className="text-[13px]">{t('add.startNow')}</div>
            <div className="text-[11px] text-subtle">{t('add.startNowHint')}</div>
          </div>
          <Switch checked={start} onChange={setStart} label={t('add.startNow')} />
        </div>
      </div>
    </Dialog>
  );
}
