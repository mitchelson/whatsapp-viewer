import type { Message } from './parser/types';
import { normalizeForSearch } from './parser/parse';

export interface Filters {
  from: string;
  to: string;
  authors: Set<number> | null;
}

export function dayStart(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function toYmd(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dayKey(ts: number): number {
  const d = new Date(ts);
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

export function computeDays(messages: Message[]): Int32Array {
  const out = new Int32Array(messages.length);
  for (let i = 0; i < messages.length; i++) out[i] = dayKey(messages[i].ts);
  return out;
}

export function filterMessages(messages: Message[], f: Filters): Uint32Array {
  const from = f.from ? dayStart(f.from) : -Infinity;
  const to = f.to ? dayStart(f.to) + 86_400_000 : Infinity;
  const authors = f.authors;
  const out = new Uint32Array(messages.length);
  let n = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.ts < from || m.ts >= to) continue;
    if (authors && (m.author === -1 || !authors.has(m.author))) continue;
    out[n++] = i;
  }
  return out.subarray(0, n);
}

export interface Rows {
  /** >= 0: message index. < 0: date chip for message index `-v - 1`. */
  rows: Int32Array;
  /** Row position for each message index, -1 when filtered out. */
  rowOf: Int32Array;
}

export function buildRows(filtered: Uint32Array, days: Int32Array, total: number): Rows {
  const rows = new Int32Array(filtered.length * 2);
  const rowOf = new Int32Array(total).fill(-1);
  let n = 0;
  let lastDay = -1;
  for (let k = 0; k < filtered.length; k++) {
    const i = filtered[k];
    if (days[i] !== lastDay) {
      lastDay = days[i];
      rows[n++] = -i - 1;
    }
    rowOf[i] = n;
    rows[n++] = i;
  }
  return { rows: rows.slice(0, n), rowOf };
}

export function searchMessages(messages: Message[], filtered: Uint32Array, query: string): Uint32Array {
  const q = normalizeForSearch(query.trim());
  if (!q) return new Uint32Array(0);
  const out = new Uint32Array(filtered.length);
  let n = 0;
  for (let k = 0; k < filtered.length; k++) {
    const i = filtered[k];
    if (messages[i].norm.includes(q)) out[n++] = i;
  }
  return out.slice(0, n);
}
