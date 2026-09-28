import { pt, type Dict } from './pt';
import { en } from './en';

export type Lang = 'pt' | 'en';
export type { Dict };

export const dicts: Record<Lang, Dict> = { pt, en };

export const routes = {
  pt: { home: '/', viewer: '/viewer' },
  en: { home: '/en', viewer: '/en/viewer' },
} as const;

export type Page = keyof (typeof routes)['pt'];

export function t(lang: Lang): Dict {
  return dicts[lang];
}

export const REPO_URL = 'https://github.com/mitchelson/whatsapp-viewer';
