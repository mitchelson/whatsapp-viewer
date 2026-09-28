import type { MediaKind } from './types';

/** iOS: `<attached: 00000012-PHOTO-2026-09-28-09-45-12.jpg>`, `<anexado: ...>`, `<adjunto: ...>` */
const IOS_ATTACH_RE = /^<[^:<>]{2,40}:\s*([^<>]+?\.[a-z0-9]{2,5})>$/i;

/** Android: `IMG-20260928-WA0001.jpg (arquivo anexado)`, `(file attached)`, `(archivo adjunto)` */
const ANDROID_ATTACH_RE = /^(\S[^\n]*?\.[a-z0-9]{2,5}) \([^()]{3,40}\)$/i;

const OMITTED_RE =
  /^<?(m[íi]dia oculta|media omitted|multimedia omitido|arquivo de m[íi]dia oculto|medien ausgeschlossen|m[ée]dias omis|media omessi)>?$/i;

const IOS_OMITTED_RE =
  /^(imagem|image|imagen|v[íi]deo|[áa]udio|audio|figurinha|sticker|gif|documento|document|contact card|cart[ãa]o de contato|tarjeta de contacto)\b.{0,60}\b(ocultad[oa]|omitid[oa]|omitted)$/i;

const DELETED_RE =
  /^(esta mensagem foi apagada|mensagem apagada|voc[êe] apagou esta mensagem|this message was deleted|you deleted this message|se elimin[óo] este mensaje|eliminaste este mensaje|este mensaje fue eliminado)\.?$/i;

const EDITED_RE = /\s*<[^<>]*(editad|edited|bearbeitet|modifi)[^<>]*>$/i;

const IMAGE = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'avif']);
const VIDEO = new Set(['mp4', 'mov', '3gp', 'webm', 'm4v', 'mkv']);
const AUDIO = new Set(['opus', 'ogg', 'oga', 'm4a', 'mp3', 'aac', 'wav', 'amr']);

export function mediaKind(name: string): MediaKind {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'webp' && /sticker|^stk-/i.test(name)) return 'sticker';
  if (IMAGE.has(ext)) return 'image';
  if (VIDEO.has(ext)) return 'video';
  if (AUDIO.has(ext)) return 'audio';
  return 'doc';
}

export function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    bmp: 'image/bmp',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    '3gp': 'video/3gpp',
    opus: 'audio/ogg',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    wav: 'audio/wav',
    pdf: 'application/pdf',
    vcf: 'text/vcard',
    txt: 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}

export interface Classified {
  kind: 'text' | 'media' | 'omitted' | 'deleted';
  text: string;
  mediaName?: string;
  edited: boolean;
}

export function classify(raw: string): Classified {
  let text = raw;
  let edited = false;
  if (EDITED_RE.test(text)) {
    edited = true;
    text = text.replace(EDITED_RE, '');
  }

  const nl = text.indexOf('\n');
  const firstLine = (nl === -1 ? text : text.slice(0, nl)).trim();
  const rest = nl === -1 ? '' : text.slice(nl + 1).trim();

  const attach = IOS_ATTACH_RE.exec(firstLine) ?? ANDROID_ATTACH_RE.exec(firstLine);
  if (attach) {
    return { kind: 'media', text: rest, mediaName: attach[1].trim(), edited };
  }

  const trimmed = text.trim();
  if (trimmed.length < 90 && (OMITTED_RE.test(trimmed) || IOS_OMITTED_RE.test(trimmed))) {
    return { kind: 'omitted', text: '', edited };
  }
  if (trimmed.length < 60 && DELETED_RE.test(trimmed)) {
    return { kind: 'deleted', text: '', edited };
  }
  return { kind: 'text', text, edited };
}
