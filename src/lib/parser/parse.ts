import { classify, mediaKind } from './attachments';
import { BIDI_RE, HEADER_RE, SPACE_RE, buildTimestamp, detectDateOrder, toHour24 } from './formats';
import type { Message, ParsedChat } from './types';

const LEADING_BIDI_RE = /^[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/;
const IOS_LRM_BODY_RE = /\]\s*[^\n]*?:\s\u200e/;

const normCache = new Map<string, string>();

/** Lowercase and strip diacritics while keeping a 1:1 mapping of UTF-16 code units to the source text. */
export function normalizeForSearch(text: string): string {
  if (!/[^\x00-\x7f]/.test(text)) return text.toLowerCase();
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c.charCodeAt(0) < 128) {
      out += c.toLowerCase();
      continue;
    }
    let n = normCache.get(c);
    if (n === undefined) {
      const lower = c.toLowerCase();
      const base = lower.normalize('NFD')[0];
      n = lower.length === 1 && base ? base : c;
      normCache.set(c, n);
    }
    out += n;
  }
  return out;
}

interface Pending {
  ts: number;
  author: string | null;
  lines: string[];
  lrm: boolean;
}

export function parseChat(input: string): ParsedChat {
  const lines = input.replace(SPACE_RE, ' ').split(/\r\n|\n|\r/);
  const matches: Array<RegExpExecArray | null> = new Array(lines.length);
  const samples: Array<[string, string]> = [];
  let hasMeridiem = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const c = raw.charCodeAt(0);
    const quick = c === 91 /* [ */ || (c >= 48 && c <= 57) || c === 0x200e || c === 0x200f || c === 0xfeff;
    if (!quick) {
      matches[i] = null;
      continue;
    }
    const m = HEADER_RE.exec(raw.replace(LEADING_BIDI_RE, '').replace(BIDI_RE, ''));
    matches[i] = m;
    if (m) {
      if (samples.length < 4000) samples.push([m[1], m[2]]);
      if (m[7]) hasMeridiem = true;
    }
  }

  const dateOrder = detectDateOrder(samples, hasMeridiem);
  const messages: Message[] = [];
  const authors: string[] = [];
  const counts: number[] = [];
  const authorIndex = new Map<string, number>();
  let pending: Pending | null = null;

  const flush = () => {
    if (!pending) return;
    const body = pending.lines.join('\n').replace(BIDI_RE, '');
    const c = classify(body);
    let author = -1;
    let type: Message['type'] = c.kind;

    const isSystem =
      pending.author === null || (c.kind === 'text' && pending.lrm && !/https?:\/\//i.test(body));

    if (isSystem) {
      type = 'system';
    } else {
      const name = pending.author!;
      let idx = authorIndex.get(name);
      if (idx === undefined) {
        idx = authors.length;
        authors.push(name);
        counts.push(0);
        authorIndex.set(name, idx);
      }
      counts[idx]++;
      author = idx;
    }

    const text = type === 'system' ? body.trim() : c.text;
    const msg: Message = {
      id: messages.length,
      ts: pending.ts,
      author,
      type,
      text,
      norm: normalizeForSearch(text),
    };
    if (c.mediaName && type === 'media') msg.media = { name: c.mediaName, kind: mediaKind(c.mediaName) };
    if (c.edited) msg.edited = true;
    messages.push(msg);
    pending = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const m = matches[i];
    if (!m) {
      if (pending) pending.lines.push(lines[i]);
      continue;
    }
    flush();
    const ts = buildTimestamp(
      m[1],
      m[2],
      m[3],
      dateOrder,
      toHour24(+m[4], m[7]),
      +m[5],
      m[6] ? +m[6] : 0,
    );
    const rest = m[8];
    const sep = rest.indexOf(': ');
    let author: string | null = null;
    let body = rest;
    if (sep > 0 && sep <= 80) {
      const candidate = rest.slice(0, sep).trim();
      if (candidate && !/["“”]/.test(candidate)) {
        author = candidate;
        body = rest.slice(sep + 2);
      }
    } else if (rest.endsWith(':') && rest.length <= 81) {
      author = rest.slice(0, -1).trim();
      body = '';
    }
    pending = { ts, author, lines: [body], lrm: author !== null && IOS_LRM_BODY_RE.test(lines[i]) };
  }
  flush();

  return { messages, authors, counts, dateOrder };
}

export function chatNameFromFile(fileName: string): string {
  return fileName
    .replace(/\.(txt|zip)$/i, '')
    .replace(
      /^(whatsapp chat (with|-)|conversa do whatsapp (com|-)|chat de whatsapp (con|-)|whatsapp-chat mit|discussion whatsapp avec|chat whatsapp con)\s*/i,
      '',
    )
    .replace(/^_chat$/i, '')
    .trim();
}
