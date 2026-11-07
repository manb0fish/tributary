import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { TorrentTable } from './components/table/TorrentTable';
import { Inspector } from './components/inspector/Inspector';
import { ConnectionGate, DropOverlay, StatusBar, Toaster } from './components/Chrome';
import { AddTorrentDialog } from './components/dialogs/AddTorrentDialog';
import { LabelsDialog, LocationDialog, RemoveDialog, ShortcutsDialog } from './components/dialogs/SmallDialogs';
import { PreferencesDialog } from './components/dialogs/PreferencesDialog';
import { TooltipProvider } from './components/ui/misc';
import { useGlobalShortcuts } from './hooks/shortcuts';
import { useConnection } from './lib/rpc/connection';
import { useStats } from './hooks/queries';
import { useUi } from './store/ui';
import { useI18n } from './i18n';

function useTheme() {
  const theme = useUi((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function useTitle() {
  const { data } = useStats();
  useEffect(() => {
    if (!data) return;
    const fmt = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}M` : n >= 1024 ? `${Math.round(n / 1024)}K` : `${n}`);
    document.title = data.downloadSpeed || data.uploadSpeed ? `↓${fmt(data.downloadSpeed)} ↑${fmt(data.uploadSpeed)} · Tributary` : 'Tributary';
  }, [data]);
}

function Dialogs() {
  const d = useUi((s) => s.dialog);
  switch (d.kind) {
    case 'add':
      return <AddTorrentDialog initialFiles={d.files} initialMagnet={d.magnet} />;
    case 'remove':
      return <RemoveDialog ids={d.ids} deleteData={d.deleteData} />;
    case 'labels':
      return <LabelsDialog ids={d.ids} />;
    case 'location':
      return <LocationDialog ids={d.ids} />;
    case 'prefs':
      return <PreferencesDialog />;
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'none':
      return null;
  }
}

export function App() {
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  // Re-render the whole tree when the language changes (nothing below is memoised).
  useI18n((s) => s.locale);
  useTheme();
  useTitle();
  useGlobalShortcuts();

  useEffect(() => {
    void useConnection.getState().connect(useUi.getState().connection);
  }, []);

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={150}>
      <div className="flex h-full">
        {sidebarOpen && <Sidebar />}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Toolbar />
          <main className="flex min-h-0 flex-1 flex-col">
            <TorrentTable />
            <Inspector />
          </main>
          <StatusBar />
          <ConnectionGate />
        </div>
      </div>
      <Dialogs />
      <Toaster />
      <DropOverlay />
    </TooltipProvider>
  );
}
