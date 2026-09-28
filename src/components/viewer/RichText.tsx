import type { ComponentChildren } from 'preact';
import { normalizeForSearch } from '../../lib/parser/parse';

type Kind = 'plain' | 'link' | 'b' | 'i' | 's' | 'code';
interface Seg {
  s: number;
  e: number;
  kind: Kind;
  href?: string;
}

const TOKEN_RE =
  /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)|```([^`]+?)```|(^|[\s([{"'])([*_~])(?=\S)([^\n]*?\S)\4(?=$|[\s.,!?;:)\]}"'])/g;
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;
const FORMAT: Record<string, Kind> = { '*': 'b', _: 'i', '~': 's' };

function segment(text: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  const push = (s: number, e: number, kind: Kind, href?: string) => {
    if (s > last) segs.push({ s: last, e: s, kind: 'plain' });
    segs.push({ s, e, kind, href });
  };
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text))) {
    if (m[1]) {
      let url = m[1];
      const trail = TRAILING_PUNCT.exec(url);
      if (trail) url = url.slice(0, -trail[0].length);
      const s = m.index;
      push(s, s + url.length, 'link', url.startsWith('www.') ? 'https://' + url : url);
      last = s + url.length;
      TOKEN_RE.lastIndex = last;
    } else if (m[2] !== undefined) {
      const s = m.index + 3;
      if (m.index > last) segs.push({ s: last, e: m.index, kind: 'plain' });
      segs.push({ s, e: s + m[2].length, kind: 'code' });
      last = m.index + m[0].length;
    } else {
      const start = m.index + m[3].length;
      const s = start + 1;
      if (start > last) segs.push({ s: last, e: start, kind: 'plain' });
      segs.push({ s, e: s + m[5].length, kind: FORMAT[m[4]] });
      last = s + m[5].length + 1;
    }
  }
  if (last < text.length) segs.push({ s: last, e: text.length, kind: 'plain' });
  return segs;
}

function findRanges(norm: string, q: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (!q) return out;
  let i = norm.indexOf(q);
  while (i !== -1 && out.length < 200) {
    out.push([i, i + q.length]);
    i = norm.indexOf(q, i + q.length);
  }
  return out;
}

function highlight(text: string, s: number, e: number, ranges: Array<[number, number]>, current: boolean) {
  if (!ranges.length) return text.slice(s, e);
  const parts: ComponentChildren[] = [];
  let pos = s;
  for (const [rs, re] of ranges) {
    if (re <= s || rs >= e) continue;
    const a = Math.max(rs, s);
    const b = Math.min(re, e);
    if (a > pos) parts.push(text.slice(pos, a));
    parts.push(<mark class={current ? 'wa-hl current' : 'wa-hl'}>{text.slice(a, b)}</mark>);
    pos = b;
  }
  if (pos < e) parts.push(text.slice(pos, e));
  return parts;
}

interface Props {
  text: string;
  norm: string;
  query?: string;
  current?: boolean;
}

export function RichText({ text, norm, query = '', current = false }: Props) {
  const q = query ? normalizeForSearch(query.trim()) : '';
  const ranges = findRanges(norm, q);
  const segs = segment(text);
  return (
    <>
      {segs.map((seg) => {
        const inner = highlight(text, seg.s, seg.e, ranges, current);
        switch (seg.kind) {
          case 'link':
            return (
              <a href={seg.href} target="_blank" rel="noopener noreferrer nofollow">
                {inner}
              </a>
            );
          case 'b':
            return <strong>{inner}</strong>;
          case 'i':
            return <em>{inner}</em>;
          case 's':
            return <s>{inner}</s>;
          case 'code':
            return <code>{inner}</code>;
          default:
            return inner;
        }
      })}
    </>
  );
}
