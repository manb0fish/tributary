import { Lock, Zap } from 'lucide-react';
import type { TorrentDetail } from '../../lib/rpc/types';
import { formatPercent, formatSpeed } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ProgressBar, Tip } from '../ui/misc';
import { useT, type MessageKey } from '../../i18n';

const FLAG_HELP: Record<string, MessageKey> = {
  D: 'peers.flagD',
  d: 'peers.flagd',
  U: 'peers.flagU',
  u: 'peers.flagu',
  K: 'peers.flagK',
  '?': 'peers.flagQ',
  E: 'peers.flagE',
  X: 'peers.flagX',
  H: 'peers.flagH',
  I: 'peers.flagI',
  T: 'peers.flagT',
};

export function PeersTab({ detail }: { detail: TorrentDetail | null }) {
  const t = useT();
  if (!detail) return <div className="flex h-full items-center justify-center text-xs text-subtle">{t('peers.loading')}</div>;
  const peers = [...detail.peers].sort((a, b) => b.rateToClient + b.rateToPeer - (a.rateToClient + a.rateToPeer) || b.progress - a.progress);
  if (!peers.length) return <div className="flex h-full items-center justify-center text-xs text-subtle">{t('peers.none')}</div>;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead className="glass sticky top-0 z-10 text-[11px] text-subtle">
          <tr className="h-7 border-b border-line text-left [&>th]:px-3 [&>th]:font-medium">
            <th className="w-6" />
            <th>{t('peers.address')}</th>
            <th>{t('peers.client')}</th>
            <th>{t('peers.flags')}</th>
            <th className="w-40">{t('peers.progress')}</th>
            <th className="text-right">{t('peers.down')}</th>
            <th className="text-right">{t('peers.up')}</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={`${p.address}:${p.port}`} className="h-[28px] border-b border-line/50 hover:bg-surface-2/70 [&>td]:px-3">
              <td className="text-subtle">
                <span className="flex gap-0.5 [&_svg]:size-3">
                  {p.isEncrypted && <Lock aria-label={t('peers.encrypted')} />}
                  {p.isUTP && <Zap aria-label="µTP" />}
                </span>
              </td>
              <td className="num max-w-[220px] truncate">{p.address}</td>
              <td className="max-w-[200px] truncate text-muted">{p.clientName || t('peers.unknown')}</td>
              <td>
                <Tip label={<FlagList flags={p.flagStr} />} side="top">
                  <span className="num cursor-help tracking-wider text-muted">{p.flagStr || '—'}</span>
                </Tip>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <ProgressBar value={p.progress} tone={p.progress >= 1 ? 'emerald' : 'sky'} className="flex-1" />
                  <span className="num w-10 text-right text-[10.5px] text-muted">{formatPercent(p.progress)}</span>
                </div>
              </td>
              <td className={cn('num text-right', !p.rateToClient && 'text-subtle/70')}>{formatSpeed(p.rateToClient)}</td>
              <td className={cn('num text-right', !p.rateToPeer && 'text-subtle/70')}>{formatSpeed(p.rateToPeer)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlagList({ flags }: { flags: string }) {
  const t = useT();
  if (!flags) return <span>{t('peers.noFlags')}</span>;
  return (
    <span className="block space-y-0.5">
      {[...flags].map((f, i) => (
        <span key={i} className="flex gap-2">
          <span className="num w-3 text-accent">{f}</span>
          <span>{t(FLAG_HELP[f] ?? 'peers.unknownFlag')}</span>
        </span>
      ))}
    </span>
  );
}
