import { currentLocale, t } from '../i18n';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/* Intl formatters are expensive to construct — cache per locale + options. */
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function fixed(digits: number): Intl.NumberFormat {
  const key = `n|${currentLocale()}|${digits}`;
  let f = cache.get(key) as Intl.NumberFormat | undefined;
  if (!f) cache.set(key, (f = new Intl.NumberFormat(currentLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })));
  return f;
}

function dateFmt(kind: 'long' | 'short'): Intl.DateTimeFormat {
  const key = `d|${currentLocale()}|${kind}`;
  let f = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) {
    const opts: Intl.DateTimeFormatOptions = kind === 'long' ? { dateStyle: 'medium', timeStyle: 'short' } : { year: 'numeric', month: 'short', day: 'numeric' };
    cache.set(key, (f = new Intl.DateTimeFormat(currentLocale(), opts)));
  }
  return f;
}

function rtf(): Intl.RelativeTimeFormat {
  const key = `r|${currentLocale()}`;
  let f = cache.get(key) as Intl.RelativeTimeFormat | undefined;
  if (!f) cache.set(key, (f = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto', style: 'narrow' })));
  return f;
}

export function formatNumber(n: number, digits = 0): string {
  return fixed(digits).format(n);
}

export function formatBytes(n: number, digits?: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  let i = 0;
  let v = n;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i++;
  }
  const d = digits ?? (v >= 100 ? 0 : v >= 10 ? 1 : 2);
  return `${fixed(d).format(v)} ${UNITS[i]}`;
}

export function formatSpeed(n: number, zero = '—'): string {
  if (!n || n <= 0) return zero;
  return `${formatBytes(n, n >= 1024 * 1024 * 100 ? 0 : 1)}/s`;
}

const unit = (u: 'sec' | 'min' | 'hour' | 'day', n: number) => t(`units.${u}`, { n });

export function formatEta(sec: number): string {
  if (sec === -1) return '—';
  if (sec === -2 || !Number.isFinite(sec)) return '∞';
  if (sec < 60) return unit('sec', Math.round(sec));
  const m = Math.floor(sec / 60);
  if (m < 60) return `${unit('min', m)} ${unit('sec', Math.floor(sec % 60))}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${unit('hour', h)} ${unit('min', m % 60)}`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${unit('day', d)} ${unit('hour', h % 24)}`;
  return t('units.overYear');
}

export function formatDuration(sec: number): string {
  if (sec <= 0) return '—';
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${unit('day', d)} ${unit('hour', h)}`;
  if (h) return `${unit('hour', h)} ${unit('min', m)}`;
  return `${unit('min', m)} ${unit('sec', Math.floor(sec % 60))}`;
}

export function formatPercent(p: number): string {
  if (p >= 1) return `${fixed(0).format(100)}%`;
  return `${fixed(1).format(Math.floor(p * 1000) / 10)}%`;
}

export function formatRatio(r: number): string {
  if (r === -1) return '—';
  if (r === -2) return '∞';
  return fixed(r >= 100 ? 0 : 2).format(r);
}

export function formatDate(sec: number): string {
  return sec ? dateFmt('long').format(sec * 1000) : '—';
}

export function formatShortDate(sec: number): string {
  return sec ? dateFmt('short').format(sec * 1000) : '—';
}

export function formatRelative(sec: number): string {
  if (!sec) return '—';
  const diff = sec - Date.now() / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return diff < 0 ? t('units.justNow') : t('units.soon');
  if (abs < 3600) return rtf().format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return rtf().format(Math.round(diff / 3600), 'hour');
  if (abs < 86_400 * 30) return rtf().format(Math.round(diff / 86_400), 'day');
  if (abs < 86_400 * 365) return rtf().format(Math.round(diff / (86_400 * 30)), 'month');
  return rtf().format(Math.round(diff / (86_400 * 365)), 'year');
}
