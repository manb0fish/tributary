import {
  Columns3,
  Keyboard,
  Languages,
  Monitor,
  Moon,
  PanelBottom,
  PanelLeft,
  Pause,
  Play,
  Plus,
  Plug,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  Timer,
  Trash2,
  Turtle,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import { useTorrentActions } from '../hooks/actions';
import { useSession, useSessionMutation } from '../hooks/queries';
import { useConnection, type ConnectionPreference } from '../lib/rpc/connection';
import { LOCALES, setLocale, useI18n, useT, type Locale } from '../i18n';
import { toast, useUi, type Theme } from '../store/ui';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from './ui/menu';
import { Kbd, Tip } from './ui/misc';
import { COLUMN_KEYS } from './table/columns';

export function Toolbar() {
  const t = useT();
  const search = useUi((s) => s.search);
  const selected = useUi((s) => s.selected);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const inspectorOpen = useUi((s) => s.inspectorOpen);
  const ui = useUi.getState();
  const actions = useTorrentActions();
  const { data: session } = useSession();
  const setSession = useSessionMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = [...selected];
  const none = ids.length === 0;
  const turtle = session?.['alt-speed-enabled'] ?? false;

  const toggleTurtle = () => {
    setSession({ 'alt-speed-enabled': !turtle })
      .then(() =>
        toast.info(
          turtle ? t('turtle.off') : t('turtle.on'),
          turtle ? t('turtle.offBody') : t('turtle.onBody', { down: session?.['alt-speed-down'] ?? 0, up: session?.['alt-speed-up'] ?? 0 }),
        ),
      )
      .catch((e: unknown) => toast.error(t('turtle.failed'), String(e)));
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
      <Tip label={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')} shortcut="[">
        <Button variant="ghost" size="icon-sm" onClick={ui.toggleSidebar} aria-label={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}>
          <PanelLeft />
        </Button>
      </Tip>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
        <input
          ref={inputRef}
          id="global-search"
          value={search}
          onChange={(e) => ui.setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              ui.setSearch('');
              inputRef.current?.blur();
            }
          }}
          placeholder={t('toolbar.search')}
          aria-label={t('toolbar.search')}
          className="h-8 w-full rounded-md border border-line bg-surface-1 pr-14 pl-8 text-[13px] placeholder:text-subtle transition-colors outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 focus-visible:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {search ? (
            <button onClick={() => ui.setSearch('')} className="rounded p-0.5 text-subtle hover:text-fg" aria-label={t('toolbar.clearSearch')}>
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <Tip label={t('toolbar.start')} shortcut="S">
          <Button variant="ghost" size="icon-sm" disabled={none} onClick={() => actions.start(ids)} aria-label={t('toolbar.start')}>
            <Play />
          </Button>
        </Tip>
        <Tip label={t('toolbar.pause')} shortcut="P">
          <Button variant="ghost" size="icon-sm" disabled={none} onClick={() => actions.stop(ids)} aria-label={t('toolbar.pause')}>
            <Pause />
          </Button>
        </Tip>
        <Tip label={t('toolbar.verify')} shortcut="V">
          <Button variant="ghost" size="icon-sm" disabled={none} onClick={() => actions.verify(ids)} aria-label={t('toolbar.verify')}>
            <RefreshCw />
          </Button>
        </Tip>
        <Tip label={t('toolbar.remove')} shortcut="Del">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={none}
            className="hover:text-rose-500"
            onClick={() => ui.openDialog({ kind: 'remove', ids, deleteData: false })}
            aria-label={t('toolbar.remove')}
          >
            <Trash2 />
          </Button>
        </Tip>
      </div>

      <div className="mx-1 h-5 w-px bg-line" />

      <Tip label={turtle ? t('toolbar.turtleOn') : t('toolbar.turtleOff')} shortcut="T">
        <Button
          variant="ghost"
          size="icon-sm"
          active={turtle}
          onClick={toggleTurtle}
          disabled={!session}
          aria-label={t('toolbar.turtleOff')}
          className={turtle ? '!bg-amber-500/10 !text-amber-500' : ''}
        >
          <Turtle />
        </Button>
      </Tip>
      <Tip label={inspectorOpen ? t('toolbar.hideInspector') : t('toolbar.showInspector')} shortcut="I">
        <Button variant="ghost" size="icon-sm" active={inspectorOpen} onClick={() => ui.setInspectorOpen(!inspectorOpen)} aria-label={t('toolbar.showInspector')}>
          <PanelBottom />
        </Button>
      </Tip>
      <SettingsMenu />

      <Button variant="primary" size="md" className="ml-1" onClick={() => ui.openDialog({ kind: 'add', files: [], magnet: '' })}>
        <Plus /> {t('toolbar.add')}
      </Button>
    </header>
  );
}

function SettingsMenu() {
  const t = useT();
  const theme = useUi((s) => s.theme);
  const refreshMs = useUi((s) => s.refreshMs);
  const connection = useUi((s) => s.connection);
  const visibility = useUi((s) => s.columnVisibility);
  const mode = useConnection((s) => s.mode);
  const locale = useI18n((s) => s.locale);
  const ui = useUi.getState();
  const modeLabel = { demo: t('menu.modeDemo'), live: t('menu.modeLive'), connecting: t('menu.modeConnecting'), error: t('menu.modeError') }[mode];

  return (
    <DropdownMenu>
      <Tip label={t('toolbar.settings')}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('toolbar.settings')}>
            <SlidersHorizontal />
          </Button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem icon={<Settings2 />} shortcut="," onSelect={() => ui.openDialog({ kind: 'prefs' })}>
          {t('menu.preferences')}
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Keyboard />} shortcut="?" onSelect={() => ui.openDialog({ kind: 'shortcuts' })}>
          {t('menu.shortcuts')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub label={t('menu.language')} icon={<Languages />}>
          <DropdownMenuRadioGroup value={locale} onValueChange={(v) => void setLocale(v as Locale)}>
            {LOCALES.map((l) => (
              <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
                {l.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSub>
        <DropdownMenuSub label={t('menu.columns')} icon={<Columns3 />}>
          {Object.entries(COLUMN_KEYS)
            .filter(([id]) => id !== 'name')
            .map(([id, key]) => (
              <DropdownMenuCheckboxItem key={id} checked={visibility[id] !== false} onCheckedChange={(v) => ui.setColumnVisibility({ ...useUi.getState().columnVisibility, [id]: v })}>
                {t(key)}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuSub>
        <DropdownMenuSub label={t('menu.theme')} icon={theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : <Monitor />}>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => ui.setTheme(v as Theme)}>
            <DropdownMenuRadioItem value="dark">{t('menu.themeDark')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">{t('menu.themeLight')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">{t('menu.themeSystem')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSub>
        <DropdownMenuSub label={t('menu.refresh')} icon={<Timer />}>
          <DropdownMenuRadioGroup value={String(refreshMs)} onValueChange={(v) => ui.setRefreshMs(Number(v))}>
            {[1000, 2000, 5000, 10000].map((ms) => (
              <DropdownMenuRadioItem key={ms} value={String(ms)}>
                {t('menu.every', { n: ms / 1000 })}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('menu.connection', { mode: modeLabel })}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={connection}
          onValueChange={(v) => {
            const pref = v as ConnectionPreference;
            ui.setConnection(pref);
            void useConnection.getState().connect(pref);
          }}
        >
          <DropdownMenuRadioItem value="auto">{t('menu.connAuto')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="live">{t('menu.connLive')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="demo">{t('menu.connDemo')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuItem icon={<Plug />} onSelect={() => void useConnection.getState().connect(useUi.getState().connection)}>
          {t('menu.reconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
