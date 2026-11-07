/**
 * Tiny, fully typed i18n layer.
 *
 *   t('toolbar.start')                       → "Start"
 *   t('common.torrents', { count: 3 })       → "3 torrents"   (Intl.PluralRules)
 *   t('sidebar.free', { size: '1.2 TB' })    → "1.2 TB free"
 *
 * Keys are checked at compile time against the English source; every locale
 * file must provide exactly the same shape. Non-English locales are lazy-loaded.
 */
import { create } from 'zustand';
import { en } from './locales/en';

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

type Widen<T> = T extends string ? string : T extends { readonly other: string } ? PluralForms : { -readonly [K in keyof T]: Widen<T[K]> };

/** Shape every locale must implement. */
export type Messages = Widen<typeof en>;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | PluralForms ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Vars = Record<string, string | number>;

export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];

const loaders: Record<Exclude<Locale, 'en'>, () => Promise<Messages>> = {
  'zh-CN': () => import('./locales/zh-CN').then((m) => m.default),
  es: () => import('./locales/es').then((m) => m.default),
  fr: () => import('./locales/fr').then((m) => m.default),
  de: () => import('./locales/de').then((m) => m.default),
  ja: () => import('./locales/ja').then((m) => m.default),
};

const STORAGE_KEY = 'tr-locale';

interface I18nState {
  locale: Locale;
  messages: Messages;
  /** true once the user picked a language explicitly */
  explicit: boolean;
}

export const useI18n = create<I18nState>(() => ({ locale: 'en', messages: en, explicit: false }));

const isLocale = (s: string): s is Locale => LOCALES.some((l) => l.code === s);

function storedLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

/** Best match for the browser's preferred languages (e.g. "zh-Hans-CN" → "zh-CN", "fr-CA" → "fr"). */
export function detectLocale(): Locale {
  for (const raw of navigator.languages ?? [navigator.language]) {
    const tag = raw.toLowerCase();
    const exact = LOCALES.find((l) => l.code.toLowerCase() === tag);
    if (exact) return exact.code;
    const lang = tag.split('-')[0];
    const partial = LOCALES.find((l) => l.code.toLowerCase().split('-')[0] === lang);
    if (partial) return partial.code;
  }
  return 'en';
}

export async function setLocale(locale: Locale, explicit = true): Promise<void> {
  const messages = locale === 'en' ? en : await loaders[locale]();
  useI18n.setState({ locale, messages, explicit });
  document.documentElement.lang = locale;
  if (explicit) {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* private mode */
    }
  }
}

/** Resolve the initial language before first render (avoids an English flash). */
export async function initI18n(): Promise<void> {
  const stored = storedLocale();
  try {
    await setLocale(stored ?? detectLocale(), stored !== null);
  } catch {
    await setLocale('en', false);
  }
}

/* ----------------------------------------------------------- translate */

const ruleCache = new Map<string, Intl.PluralRules>();
const numCache = new Map<string, Intl.NumberFormat>();

function lookup(messages: Messages, key: string): string | PluralForms | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node !== null && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  if (typeof node === 'string') return node;
  if (node !== null && typeof node === 'object' && 'other' in node) return node as PluralForms;
  return undefined;
}

function translate(locale: Locale, messages: Messages, key: MessageKey, vars?: Vars): string {
  const node = lookup(messages, key) ?? lookup(en, key) ?? key;
  let s: string;
  if (typeof node === 'string') {
    s = node;
  } else {
    const n = Number(vars?.count ?? 0);
    let rules = ruleCache.get(locale);
    if (!rules) ruleCache.set(locale, (rules = new Intl.PluralRules(locale)));
    const form = rules.select(n) as keyof PluralForms;
    s = (n === 0 ? node.zero : undefined) ?? node[form] ?? node.other;
  }
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = vars[name];
    if (v === undefined) return match;
    if (typeof v === 'string') return v;
    let nf = numCache.get(locale);
    if (!nf) numCache.set(locale, (nf = new Intl.NumberFormat(locale)));
    return nf.format(v);
  });
}

/** Translate using the current language. Safe to call outside React. */
export function t(key: MessageKey, vars?: Vars): string {
  const { locale, messages } = useI18n.getState();
  return translate(locale, messages, key, vars);
}

/** Subscribe a component to language changes and get the translator. */
export function useT(): typeof t {
  useI18n((s) => s.messages);
  return t;
}

/** Current locale tag for Intl APIs. */
export function currentLocale(): Locale {
  return useI18n.getState().locale;
}
