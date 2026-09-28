import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { authorColor, formatDayChip, formatTime } from '../../lib/format';
import type { Message } from '../../lib/parser/types';
import {
  authors,
  currentMatchId,
  dict,
  flashId,
  isGroup,
  lightbox,
  locale,
  me,
  media,
  mediaIds,
  query,
} from '../../lib/store';
import { BanIcon, CameraIcon, DocIcon, DownloadIcon, TailIn, TailOut } from './icons';
import { RichText } from './RichText';

/** Present while rendering the print view: pre-resolved media URLs, or null when images are excluded. */
export const PrintContext = createContext<{ urls: Map<string, string> | null } | null>(null);

function useMediaUrl(name: string | null): string | null | undefined {
  const print = useContext(PrintContext);
  const store = media.value;
  const [url, setUrl] = useState<string | null | undefined>(() =>
    print && name ? (print.urls?.get(name) ?? null) : undefined,
  );
  useEffect(() => {
    if (print || !name || !store) return;
    let alive = true;
    setUrl(undefined);
    store.url(name).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [name, store, print]);
  if (!name || !store) return null;
  return url;
}

export function DateChip({ ts }: { ts: number }) {
  const d = dict.value;
  return (
    <div class="wa-chip-row">
      <span class="wa-chip date">{formatDayChip(ts, locale.value, d.today, d.yesterday)}</span>
    </div>
  );
}

function openLightbox(id: number) {
  const ids = mediaIds.value.filter((i) => i !== undefined);
  const pos = ids.indexOf(id);
  lightbox.value = { ids: pos === -1 ? [id] : ids, pos: Math.max(pos, 0) };
}

function MediaBlock({ msg }: { msg: Message }) {
  const d = dict.value;
  const print = useContext(PrintContext);
  const m = msg.media!;
  const store = media.value;
  const has = !!store?.has(m.name);
  const url = useMediaUrl(has ? m.name : null);

  if (!has) {
    return (
      <div class="wa-missing">
        <CameraIcon width={18} height={18} />
        <span>
          {d.mediaMissing}
          <br />
          <small class="not-italic opacity-80">{m.name}</small>
        </span>
      </div>
    );
  }

  const asText = (
    <div class="wa-missing">
      {m.kind === 'doc' ? <DocIcon width={18} height={18} /> : <CameraIcon width={18} height={18} />}
      <span>{m.name}</span>
    </div>
  );

  switch (m.kind) {
    case 'image':
      if (print && !url) return asText;
      return (
        <button type="button" class="wa-media" onClick={() => openLightbox(msg.id)} aria-label={m.name}>
          {url ? (
            <img src={url} alt="" decoding="async" loading={print ? 'eager' : 'lazy'} />
          ) : (
            <div class="wa-media placeholder" />
          )}
        </button>
      );
    case 'sticker':
      if (print && !url) return asText;
      return (
        <div class="wa-sticker">
          {url ? <img src={url} alt="" decoding="async" /> : <div style={{ width: 150, height: 150 }} />}
        </div>
      );
    case 'video':
      if (print) return asText;
      return (
        <div class="wa-media" style={{ cursor: 'default' }}>
          {url ? <video src={url} controls preload="metadata" playsInline /> : <div class="wa-media placeholder" />}
        </div>
      );
    case 'audio':
      if (print) return asText;
      return url ? <audio class="wa-audio" src={url} controls preload="metadata" /> : <div class="wa-audio" />;
    default:
      return (
        <a class="wa-doc" href={url ?? undefined} download={m.name}>
          <DocIcon width={28} height={28} class="shrink-0 opacity-70" />
          <span class="min-w-0 flex-1 truncate text-[13.5px]">{m.name}</span>
          {!print && <DownloadIcon width={20} height={20} class="shrink-0 opacity-60" />}
        </a>
      );
  }
}

interface RowProps {
  msg: Message;
  prev: Message | null;
}

export function MessageRow({ msg, prev }: RowProps) {
  const d = dict.value;
  const print = useContext(PrintContext);
  const q = print ? '' : query.value;
  const current = currentMatchId.value === msg.id;

  if (msg.type === 'system') {
    return (
      <div class="wa-chip-row">
        <span class="wa-chip system">
          <RichText text={msg.text} norm={msg.norm} query={q} current={current} />
        </span>
      </div>
    );
  }

  const out = msg.author === me.value;
  const first = !prev || prev.author !== msg.author || prev.type === 'system';
  const name = authors.value[msg.author];
  const showAuthor = first && !out && isGroup.value;
  const time = formatTime(msg.ts, locale.value);
  const isSticker = msg.type === 'media' && msg.media?.kind === 'sticker';
  const isVisual = msg.type === 'media' && (msg.media?.kind === 'image' || msg.media?.kind === 'video');
  const metaOnMedia = isVisual && !msg.text && media.value?.has(msg.media!.name);

  const cls = ['wa-row', out ? 'out' : 'in', first ? 'first' : '', flashId.value === msg.id ? 'flash' : ''].join(' ');

  return (
    <div class={cls} data-msg={msg.id}>
      <div class={isSticker ? 'wa-bubble sticker' : 'wa-bubble'}>
        {first && !isSticker && (out ? <TailOut /> : <TailIn />)}
        {showAuthor && (
          <span class="wa-author" style={{ color: authorColor(name) }}>
            {name}
          </span>
        )}
        {msg.type === 'media' && <MediaBlock msg={msg} />}
        {msg.type === 'omitted' && (
          <span class="wa-missing">
            <CameraIcon width={16} height={16} />
            {d.mediaOmitted}
          </span>
        )}
        {msg.type === 'deleted' && (
          <span class="wa-missing">
            <BanIcon width={16} height={16} />
            {d.deleted}
          </span>
        )}
        {msg.text && (
          <span class="wa-text">
            <RichText text={msg.text} norm={msg.norm} query={q} current={current} />
          </span>
        )}
        {!metaOnMedia && !isSticker && <span class={msg.edited ? 'wa-spacer wide' : 'wa-spacer'} />}
        <span class={metaOnMedia ? 'wa-meta on-media' : 'wa-meta'}>
          {msg.edited ? d.edited + ' ' : ''}
          {time}
        </span>
      </div>
    </div>
  );
}
