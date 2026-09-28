import { batch, computed, signal } from '@preact/signals';
import type { Dict, Lang } from '../i18n';
import { buildRows, computeDays, filterMessages, searchMessages } from './filter';
import type { ParsedChat } from './parser/types';
import type { MediaStore } from './zip';

export type ViewerDict = Dict['viewer'];
export type Panel = 'search' | 'filters' | 'media' | null;
export type Status = 'idle' | 'reading' | 'parsing' | 'ready' | 'error';

export const lang = signal<Lang>('pt');
export const dict = signal<ViewerDict>(null as unknown as ViewerDict);
export const locale = computed(() => (lang.value === 'pt' ? 'pt-BR' : 'en-US'));

export const status = signal<Status>('idle');
export const errorMsg = signal('');
export const chat = signal<ParsedChat | null>(null);
export const chatName = signal('');
export const media = signal<MediaStore | null>(null);
export const me = signal(-1);
export const askWho = signal(false);

export const dateFrom = signal('');
export const dateTo = signal('');
export const selectedAuthors = signal<Set<number> | null>(null);
export const query = signal('');
export const matchPos = signal(-1);

export const panel = signal<Panel>(null);
export const scrollTarget = signal<{ id: number; nonce: number } | null>(null);
export const flashId = signal(-1);
export const lightbox = signal<{ ids: number[]; pos: number } | null>(null);
export const pdfOpen = signal(false);
export const printing = signal<{ images: boolean } | null>(null);

export const messages = computed(() => chat.value?.messages ?? []);
export const authors = computed(() => chat.value?.authors ?? []);
export const isGroup = computed(() => authors.value.length > 2);
export const days = computed(() => computeDays(messages.value));

export const filtered = computed(() =>
  filterMessages(messages.value, { from: dateFrom.value, to: dateTo.value, authors: selectedAuthors.value }),
);
export const rows = computed(() => buildRows(filtered.value, days.value, messages.value.length));
export const matches = computed(() => searchMessages(messages.value, filtered.value, query.value));
export const currentMatchId = computed(() => {
  const m = matches.value;
  const p = matchPos.value;
  return p >= 0 && p < m.length ? m[p] : -1;
});
export const filtersActive = computed(
  () => !!dateFrom.value || !!dateTo.value || selectedAuthors.value !== null,
);

export const mediaIds = computed(() => {
  const msgs = messages.value;
  const out: number[] = [];
  for (const i of filtered.value) {
    const k = msgs[i].media?.kind;
    if (k === 'image' || k === 'video' || k === 'sticker') out.push(i);
  }
  return out;
});

export function scrollToMessage(id: number) {
  scrollTarget.value = { id, nonce: Math.random() };
}

export function clearFilters() {
  batch(() => {
    dateFrom.value = '';
    dateTo.value = '';
    selectedAuthors.value = null;
  });
}

const meKey = (c: ParsedChat) => 'wv-me:' + c.authors.slice(0, 20).join('|');

export function setMe(idx: number) {
  me.value = idx;
  askWho.value = false;
  const c = chat.value;
  if (!c) return;
  try {
    localStorage.setItem(meKey(c), idx >= 0 ? c.authors[idx] : '');
  } catch {}
}

export function loadChat(c: ParsedChat, name: string, store: MediaStore) {
  media.value?.dispose();
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(meKey(c));
  } catch {}
  batch(() => {
    chat.value = c;
    chatName.value = name;
    media.value = store;
    dateFrom.value = '';
    dateTo.value = '';
    selectedAuthors.value = null;
    query.value = '';
    matchPos.value = -1;
    panel.value = null;
    me.value = stored ? c.authors.indexOf(stored) : -1;
    askWho.value = stored === null && c.authors.length > 1;
    status.value = 'ready';
  });
}

export function resetChat() {
  media.value?.dispose();
  batch(() => {
    chat.value = null;
    media.value = null;
    status.value = 'idle';
    panel.value = null;
  });
}
