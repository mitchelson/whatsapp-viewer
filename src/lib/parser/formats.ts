/**
 * Matches the header of a WhatsApp export line, covering:
 *   Android: `28/09/2026 09:45 - Name: text`, `9/28/26, 9:45 PM - Name: text`
 *   iOS:     `[28/09/2026, 09:45:12] Name: text`, `[9/28/26, 9:45:12 PM] Name: text`
 * Groups: 1-3 date parts, 4 hour, 5 minute, 6 second, 7 meridiem, 8 rest.
 */
export const HEADER_RE =
  /^\[?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\.?,?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([ap]\.?\s?m\.?|da manh[ãa]|da tarde|da noite|da madrugada|de la ma[ñn]ana|de la tarde|de la noche|de la madrugada)?\s*(?:\]\s*|[-–]\s)(.*)$/i;

/** Invisible direction marks WhatsApp sprinkles in exports. */
export const BIDI_RE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/** Non-standard spaces (narrow no-break space in iOS times, etc.). */
export const SPACE_RE = /[\u00a0\u2007\u202f]/g;

export type DateOrder = 'DMY' | 'MDY' | 'YMD';

export function detectDateOrder(samples: Array<[string, string]>, hasMeridiem: boolean): DateOrder {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const [a, b] of samples) {
    if (a.length === 4) return 'YMD';
    if (+a > 12) firstOver12 = true;
    if (+b > 12) secondOver12 = true;
    if (firstOver12 || secondOver12) break;
  }
  if (firstOver12) return 'DMY';
  if (secondOver12) return 'MDY';
  return hasMeridiem ? 'MDY' : 'DMY';
}

export function toHour24(hour: number, meridiem: string | undefined): number {
  if (!meridiem) return hour;
  const m = meridiem.toLowerCase();
  const pm = m.startsWith('p') || m.includes('tarde') || m.includes('noite') || m.includes('noche');
  if (pm) return hour < 12 ? hour + 12 : hour;
  return hour === 12 ? 0 : hour;
}

export function buildTimestamp(
  p1: string,
  p2: string,
  p3: string,
  order: DateOrder,
  hour: number,
  minute: number,
  second: number,
): number {
  let y: number, mo: number, d: number;
  if (order === 'YMD') {
    y = +p1;
    mo = +p2;
    d = +p3;
  } else if (order === 'MDY') {
    mo = +p1;
    d = +p2;
    y = +p3;
  } else {
    d = +p1;
    mo = +p2;
    y = +p3;
  }
  if (y < 100) y += 2000;
  return new Date(y, mo - 1, d, hour, minute, second).getTime();
}
