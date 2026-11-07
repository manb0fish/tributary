import * as Tabs from '@radix-ui/react-tabs';
import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSession, useSessionMutation, useStats } from '../../hooks/queries';
import type { Encryption, MutableSessionKey, SessionArguments, SessionSetArgs, StatsBlock as SessionStatsBlock } from '../../lib/rpc/types';
import { formatBytes, formatDuration, formatNumber, formatRatio } from '../../lib/format';
import { cn } from '../../lib/cn';
import { toast, useUi, type Theme } from '../../store/ui';
import { LOCALES, setLocale, useI18n, useT, type MessageKey } from '../../i18n';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Switch, SwitchRow } from '../ui/misc';

type Draft = Pick<SessionArguments, MutableSessionKey>;
type NumKey = { [P in MutableSessionKey]: Draft[P] extends number ? P : never }[MutableSessionKey];

const PREF_TABS: ReadonlyArray<[string, MessageKey]> = [
  ['speed', 'prefs.tabSpeed'],
  ['downloading', 'prefs.tabDownloading'],
  ['seeding', 'prefs.tabSeeding'],
  ['network', 'prefs.tabNetwork'],
  ['interface', 'prefs.tabInterface'],
  ['stats', 'prefs.tabStats'],
];

const ENC_LABEL: Record<Encryption, MessageKey> = { required: 'prefs.encRequired', preferred: 'prefs.encPreferred', tolerated: 'prefs.encTolerated' };

const MUTABLE: readonly MutableSessionKey[] = [
  'alt-speed-down',
  'alt-speed-enabled',
  'alt-speed-up',
  'dht-enabled',
  'download-dir',
  'download-queue-enabled',
  'download-queue-size',
  'encryption',
  'idle-seeding-limit',
  'idle-seeding-limit-enabled',
  'incomplete-dir',
  'incomplete-dir-enabled',
  'lpd-enabled',
  'peer-limit-global',
  'peer-limit-per-torrent',
  'peer-port',
  'pex-enabled',
  'port-forwarding-enabled',
  'rename-partial-files',
  'seedRatioLimit',
  'seedRatioLimited',
  'seed-queue-enabled',
  'seed-queue-size',
  'speed-limit-down',
  'speed-limit-down-enabled',
  'speed-limit-up',
  'speed-limit-up-enabled',
  'start-added-torrents',
  'utp-enabled',
];

export function PreferencesDialog() {
  const t = useT();
  const ui = useUi.getState();
  const { data: session } = useSession();
  return (
    <Dialog open onOpenChange={(o) => !o && ui.closeDialog()} title={t('prefs.title')} description={session ? t('prefs.description', { version: session.version, rpc: String(session['rpc-version']) }) : undefined} className="w-[min(94vw,620px)]">
      {session ? <PrefsForm session={session} /> : <div className="py-10 text-center text-xs text-subtle">{t('prefs.loading')}</div>}
    </Dialog>
  );
}

function PrefsForm({ session }: { session: SessionArguments }) {
  const t = useT();
  const ui = useUi.getState();
  const setSession = useSessionMutation();
  const [d, setD] = useState<Draft>(() => {
    const out = {} as Record<MutableSessionKey, unknown>;
    for (const k of MUTABLE) out[k] = session[k];
    return out as Draft;
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends MutableSessionKey>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const changed: SessionSetArgs = {};
  for (const k of MUTABLE) if (d[k] !== session[k]) (changed as Record<string, unknown>)[k] = d[k];
  const dirty = Object.keys(changed).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await setSession(changed);
      toast.success(t('prefs.saved'));
      ui.closeDialog();
    } catch (e) {
      toast.error(t('prefs.saveFailed'), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const num = (k: NumKey, props?: { step?: number; suffix?: string; disabled?: boolean }) => (
    <div className="relative">
      <Input
        type="number"
        min={0}
        step={props?.step ?? 1}
        disabled={props?.disabled}
        value={String(d[k])}
        onChange={(e) => set(k, Number(e.target.value))}
        className={cn('num', props?.suffix && 'pr-12')}
      />
      {props?.suffix && <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-subtle">{props.suffix}</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs.Root defaultValue="speed">
        <Tabs.List className="mb-4 flex gap-1 rounded-lg border border-line bg-surface-1 p-0.5">
          {PREF_TABS.map(([id, label]) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className="h-7 flex-1 rounded-md px-1 text-xs font-medium text-muted transition-colors hover:text-fg data-[state=active]:bg-surface-3 data-[state=active]:text-fg"
            >
              {t(label)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="speed" className="space-y-4 outline-none">
          <Group title={t('prefs.speedLimits')}>
            <LimitRow label={t('prefs.downLimit')} enabled={d['speed-limit-down-enabled']} onToggle={(v) => set('speed-limit-down-enabled', v)}>
              {num('speed-limit-down', { suffix: 'kB/s', disabled: !d['speed-limit-down-enabled'] })}
            </LimitRow>
            <LimitRow label={t('prefs.upLimit')} enabled={d['speed-limit-up-enabled']} onToggle={(v) => set('speed-limit-up-enabled', v)}>
              {num('speed-limit-up', { suffix: 'kB/s', disabled: !d['speed-limit-up-enabled'] })}
            </LimitRow>
          </Group>
          <Group title={t('prefs.turtleTitle')}>
            <SwitchRow label={t('prefs.turtleEnable')} checked={d['alt-speed-enabled']} onChange={(v) => set('alt-speed-enabled', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('prefs.download')}>{num('alt-speed-down', { suffix: 'kB/s' })}</Field>
              <Field label={t('prefs.upload')}>{num('alt-speed-up', { suffix: 'kB/s' })}</Field>
            </div>
          </Group>
        </Tabs.Content>

        <Tabs.Content value="downloading" className="space-y-4 outline-none">
          <Group title={t('prefs.locations')}>
            <Field label={t('prefs.downloadTo')}>
              <Input className="num text-[12px]" value={d['download-dir']} onChange={(e) => set('download-dir', e.target.value)} spellCheck={false} />
            </Field>
            <LimitRow label={t('prefs.keepIncomplete')} enabled={d['incomplete-dir-enabled']} onToggle={(v) => set('incomplete-dir-enabled', v)}>
              <Input className="num text-[12px]" disabled={!d['incomplete-dir-enabled']} value={d['incomplete-dir']} onChange={(e) => set('incomplete-dir', e.target.value)} spellCheck={false} />
            </LimitRow>
          </Group>
          <Group title={t('prefs.behaviour')}>
            <SwitchRow label={t('prefs.startAdded')} checked={d['start-added-torrents']} onChange={(v) => set('start-added-torrents', v)} />
            <SwitchRow label={t('prefs.renamePartial')} checked={d['rename-partial-files']} onChange={(v) => set('rename-partial-files', v)} />
          </Group>
          <Group title={t('prefs.queue')}>
            <LimitRow label={t('prefs.maxDownloads')} enabled={d['download-queue-enabled']} onToggle={(v) => set('download-queue-enabled', v)}>
              {num('download-queue-size', { disabled: !d['download-queue-enabled'] })}
            </LimitRow>
            <LimitRow label={t('prefs.maxSeeds')} enabled={d['seed-queue-enabled']} onToggle={(v) => set('seed-queue-enabled', v)}>
              {num('seed-queue-size', { disabled: !d['seed-queue-enabled'] })}
            </LimitRow>
          </Group>
        </Tabs.Content>

        <Tabs.Content value="seeding" className="space-y-4 outline-none">
          <Group title={t('prefs.stopSeeding')}>
            <LimitRow label={t('prefs.ratioReaches')} enabled={d.seedRatioLimited} onToggle={(v) => set('seedRatioLimited', v)}>
              {num('seedRatioLimit', { step: 0.1, disabled: !d.seedRatioLimited })}
            </LimitRow>
            <LimitRow label={t('prefs.idleFor')} enabled={d['idle-seeding-limit-enabled']} onToggle={(v) => set('idle-seeding-limit-enabled', v)}>
              {num('idle-seeding-limit', { suffix: t('prefs.minutes'), disabled: !d['idle-seeding-limit-enabled'] })}
            </LimitRow>
          </Group>
        </Tabs.Content>

        <Tabs.Content value="network" className="space-y-4 outline-none">
          <Group title={t('prefs.listeningPort')}>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label={t('prefs.peerPort')}>{num('peer-port')}</Field>
              <SwitchRow label={t('prefs.portForwarding')} checked={d['port-forwarding-enabled']} onChange={(v) => set('port-forwarding-enabled', v)} />
            </div>
          </Group>
          <Group title={t('prefs.peers')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('prefs.maxPeersGlobal')}>{num('peer-limit-global')}</Field>
              <Field label={t('prefs.maxPeersTorrent')}>{num('peer-limit-per-torrent')}</Field>
            </div>
            <Field label={t('prefs.encryption')}>
              <div className="flex gap-1 rounded-lg border border-line bg-surface-1 p-0.5">
                {(['required', 'preferred', 'tolerated'] as Encryption[]).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => set('encryption', e)}
                    className={cn('h-7 flex-1 rounded-md text-xs transition-colors', d.encryption === e ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg')}
                  >
                    {t(ENC_LABEL[e])}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-x-6">
              <SwitchRow label="DHT" hint={t('prefs.dhtHint')} checked={d['dht-enabled']} onChange={(v) => set('dht-enabled', v)} />
              <SwitchRow label="PEX" hint={t('prefs.pexHint')} checked={d['pex-enabled']} onChange={(v) => set('pex-enabled', v)} />
              <SwitchRow label="LPD" hint={t('prefs.lpdHint')} checked={d['lpd-enabled']} onChange={(v) => set('lpd-enabled', v)} />
              <SwitchRow label="µTP" hint={t('prefs.utpHint')} checked={d['utp-enabled']} onChange={(v) => set('utp-enabled', v)} />
            </div>
          </Group>
        </Tabs.Content>

        <Tabs.Content value="interface" className="space-y-4 outline-none">
          <InterfacePanel />
        </Tabs.Content>

        <Tabs.Content value="stats" className="outline-none">
          <StatsPanel />
        </Tabs.Content>
      </Tabs.Root>

      <div className="-mx-5 -mb-4 flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        <span className="mr-auto text-[11px] text-subtle">{dirty ? t('prefs.unsaved', { count: Object.keys(changed).length }) : t('prefs.noChanges')}</span>
        <Button variant="ghost" onClick={ui.closeDialog}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving && <Loader2 className="animate-spin" />} {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-medium tracking-wide text-subtle uppercase">{title}</h3>
      {children}
    </section>
  );
}

function LimitRow({ label, enabled, onToggle, children }: { label: string; enabled: boolean; onToggle: (v: boolean) => void; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr_minmax(0,220px)] items-center gap-3">
      <Switch checked={enabled} onChange={onToggle} label={label} />
      <span className="text-[13px]">{label}</span>
      {children}
    </div>
  );
}

function StatsPanel() {
  const t = useT();
  const { data: s } = useStats();
  if (!s) return null;
  const block = (title: string, b: SessionStatsBlock) => (
    <Group title={title}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
        <dt className="text-muted">{t('prefs.uploaded')}</dt>
        <dd className="num">{formatBytes(b.uploadedBytes)}</dd>
        <dt className="text-muted">{t('prefs.downloaded')}</dt>
        <dd className="num">{formatBytes(b.downloadedBytes)}</dd>
        <dt className="text-muted">{t('prefs.ratio')}</dt>
        <dd className="num">{b.downloadedBytes ? formatRatio(b.uploadedBytes / b.downloadedBytes) : '—'}</dd>
        <dt className="text-muted">{t('prefs.runningTime')}</dt>
        <dd className="num">{formatDuration(b.secondsActive)}</dd>
        {b.sessionCount > 1 && (
          <>
            <dt className="text-muted">{t('prefs.sessions')}</dt>
            <dd className="num">{formatNumber(b.sessionCount)}</dd>
          </>
        )}
      </dl>
    </Group>
  );
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {block(t('prefs.thisSession'), s['current-stats'])}
      {block(t('prefs.allTime'), s['cumulative-stats'])}
    </div>
  );
}


/** Client-side settings — applied immediately, stored in this browser. */
function InterfacePanel() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const theme = useUi((s) => s.theme);
  const themes: ReadonlyArray<[Theme, MessageKey]> = [
    ['dark', 'menu.themeDark'],
    ['light', 'menu.themeLight'],
    ['system', 'menu.themeSystem'],
  ];
  return (
    <>
      <Group title={t('prefs.language')}>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              onClick={() => void setLocale(l.code)}
              className={cn(
                'h-8 rounded-md border text-[13px] transition-colors',
                locale === l.code ? 'border-accent/60 bg-accent-soft text-fg' : 'border-line text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-subtle">{t('prefs.languageHint')}</p>
      </Group>
      <Group title={t('prefs.theme')}>
        <div className="flex gap-1 rounded-lg border border-line bg-surface-1 p-0.5">
          {themes.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => useUi.getState().setTheme(id)}
              className={cn('h-7 flex-1 rounded-md text-xs transition-colors', theme === id ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg')}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </Group>
    </>
  );
}
