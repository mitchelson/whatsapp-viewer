const PALETTE = [
  '#e542a3', '#1f7aec', '#06a77d', '#c75f00', '#91ab01', '#fe5f55', '#ba33dc', '#029d00',
  '#b38b00', '#ff7a2c', '#5f66cd', '#d62c3c', '#00a5f4', '#b04632', '#c263c9', '#7e9a13',
  '#009688', '#8e6cef',
];

export function authorColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '#';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    fmtCache.set(key, f);
  }
  return f;
}

export function formatTime(ts: number, locale: string): string {
  return fmt(locale, { hour: '2-digit', minute: '2-digit' }).format(ts);
}

export function formatDate(ts: number, locale: string): string {
  return fmt(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(ts);
}

export function formatDateLong(ts: number, locale: string): string {
  return fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
}

export function formatDayChip(ts: number, locale: string, today: string, yesterday: string): string {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d = new Date(ts);
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startToday - startDay) / 86_400_000);
  if (diff === 0) return today;
  if (diff === 1) return yesterday;
  if (diff > 1 && diff < 7) return fmt(locale, { weekday: 'long' }).format(ts);
  return formatDate(ts, locale);
}

export function formatNumber(n: number, locale: string): string {
  return n.toLocaleString(locale);
}

export function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
