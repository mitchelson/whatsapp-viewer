import type { Entry, FileEntry } from '@zip.js/zip.js/index-native.js';
import { mimeFor } from './parser/attachments';

const MAX_CACHED_URLS = 400;

export interface MediaStore {
  readonly size: number;
  has(name: string): boolean;
  /** Resolves a blob URL for a media file. Pinned URLs survive cache eviction until `unpinAll`. */
  url(name: string, pin?: boolean): Promise<string | null>;
  unpinAll(): void;
  dispose(): void;
}

export interface OpenedChat {
  source: Blob | string;
  fileName: string;
  media: MediaStore;
}

export class OpenError extends Error {
  constructor(public code: 'noChat' | 'unsupported') {
    super(code);
  }
}

const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);

function createStore(names: string[], load: (name: string) => Promise<Blob>, cacheLimit: number): MediaStore {
  const index = new Map<string, string>();
  for (const n of names) {
    index.set(n, n);
    const lower = n.toLowerCase();
    if (!index.has(lower)) index.set(lower, n);
  }
  const cache = new Map<string, string>();
  const pinned = new Set<string>();
  const inflight = new Map<string, Promise<string | null>>();
  const resolve = (name: string) => index.get(name) ?? index.get(name.toLowerCase());

  const evict = () => {
    if (cache.size <= cacheLimit) return;
    for (const [key, url] of cache) {
      if (cache.size <= cacheLimit) break;
      if (pinned.has(key)) continue;
      URL.revokeObjectURL(url);
      cache.delete(key);
    }
  };

  return {
    size: names.length,
    has: (name) => resolve(name) !== undefined,
    url(name, pin = false) {
      const key = resolve(name);
      if (!key) return Promise.resolve(null);
      if (pin) pinned.add(key);
      const hit = cache.get(key);
      if (hit) {
        cache.delete(key);
        cache.set(key, hit);
        return Promise.resolve(hit);
      }
      let p = inflight.get(key);
      if (!p) {
        p = load(key)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            cache.set(key, url);
            evict();
            return url;
          })
          .catch(() => null)
          .finally(() => inflight.delete(key));
        inflight.set(key, p);
      }
      return p;
    },
    unpinAll() {
      pinned.clear();
      evict();
    },
    dispose() {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
      pinned.clear();
    },
  };
}

function pickChatEntry(entries: FileEntry[]): FileEntry | undefined {
  const txts = entries.filter((e) => /\.txt$/i.test(e.filename));
  return (
    txts.find((e) => basename(e.filename) === '_chat.txt') ??
    txts.find((e) => /whatsapp|conversa|chat/i.test(basename(e.filename))) ??
    txts.sort((a, b) => b.uncompressedSize - a.uncompressedSize)[0]
  );
}

async function openZip(file: File): Promise<OpenedChat> {
  const { BlobReader, BlobWriter, TextWriter, ZipReader, configure } = await import('@zip.js/zip.js/index-native.js');
  configure({ useWebWorkers: false });
  const reader = new ZipReader(new BlobReader(file));
  const entries = (await reader.getEntries()).filter((e: Entry): e is FileEntry => !e.directory);
  const chatEntry = pickChatEntry(entries);
  if (!chatEntry) {
    await reader.close();
    throw new OpenError('noChat');
  }
  const text = await chatEntry.getData(new TextWriter());
  const byName = new Map<string, FileEntry>();
  for (const e of entries) {
    if (e === chatEntry) continue;
    byName.set(basename(e.filename), e);
  }
  const media = createStore(
    [...byName.keys()],
    (name) => byName.get(name)!.getData(new BlobWriter(mimeFor(name))),
    MAX_CACHED_URLS,
  );
  const dispose = media.dispose;
  media.dispose = () => {
    dispose();
    reader.close().catch(() => {});
  };
  return { source: text, fileName: file.name, media };
}

function openLoose(files: File[]): OpenedChat {
  const txts = files.filter((f) => /\.txt$/i.test(f.name));
  const chat =
    txts.find((f) => /whatsapp|conversa|chat/i.test(f.name)) ?? txts.sort((a, b) => b.size - a.size)[0];
  if (!chat) throw new OpenError('unsupported');
  const byName = new Map<string, File>();
  for (const f of files) if (f !== chat) byName.set(f.name, f);
  const media = createStore(
    [...byName.keys()],
    async (name) => {
      const f = byName.get(name)!;
      return f.type ? f : new Blob([f], { type: mimeFor(name) });
    },
    Number.POSITIVE_INFINITY,
  );
  return { source: chat, fileName: chat.name, media };
}

export async function openFiles(files: File[]): Promise<OpenedChat> {
  const zip = files.find((f) => /\.zip$/i.test(f.name) || f.type === 'application/zip');
  if (zip) return openZip(zip);
  return openLoose(files);
}
