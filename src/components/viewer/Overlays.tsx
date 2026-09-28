import { useEffect, useState } from 'preact/hooks';
import { authorColor, formatDateLong, formatNumber, formatTime, initials, tpl } from '../../lib/format';
import {
  askWho,
  authors,
  chat,
  dict,
  filtered,
  lightbox,
  locale,
  media,
  messages,
  panel,
  pdfOpen,
  printing,
  scrollToMessage,
  setMe,
} from '../../lib/store';
import { CloseIcon, DownloadIcon, LeftIcon, RightIcon } from './icons';

const PDF_WARN_AT = 5000;

export function WhoAreYou() {
  const d = dict.value;
  const c = chat.value;
  if (!askWho.value || !c) return null;
  const order = c.authors
    .map((_, i) => i)
    .sort((a, b) => c.counts[b] - c.counts[a])
    .slice(0, 30);

  return (
    <div class="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div class="flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-wa-panel-dark">
        <div class="px-6 pt-6 pb-3">
          <h2 class="text-lg font-medium">{d.whoTitle}</h2>
          <p class="mt-1 text-sm text-wa-muted dark:text-[#8696a0]">{d.whoHint}</p>
        </div>
        <ul class="scroll-thin min-h-0 flex-1 overflow-y-auto px-3">
          {order.map((i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setMe(i)}
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-wa-panel dark:hover:bg-white/5"
              >
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: authorColor(c.authors[i]) }}
                >
                  {initials(c.authors[i])}
                </span>
                <span class="min-w-0 flex-1 truncate">{c.authors[i]}</span>
                <span class="text-xs text-wa-muted">{formatNumber(c.counts[i], locale.value)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div class="border-t border-wa-line p-3 dark:border-wa-line-dark">
          <button
            type="button"
            onClick={() => setMe(-1)}
            class="w-full rounded-xl py-2.5 text-sm font-semibold text-wa-teal hover:bg-wa-teal/5"
          >
            {d.whoNone}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Lightbox() {
  const d = dict.value;
  const lb = lightbox.value;
  const store = media.value;
  const [url, setUrl] = useState<string | null>(null);
  const id = lb ? lb.ids[lb.pos] : -1;
  const msg = id >= 0 ? messages.value[id] : null;

  useEffect(() => {
    if (!msg?.media || !store) return;
    let alive = true;
    setUrl(null);
    store.url(msg.media.name).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id, store]);

  useEffect(() => {
    if (!lb) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') lightbox.value = null;
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lb]);

  if (!lb || !msg?.media) return null;

  function move(dir: number) {
    const cur = lightbox.value;
    if (!cur) return;
    const pos = cur.pos + dir;
    if (pos >= 0 && pos < cur.ids.length) lightbox.value = { ...cur, pos };
  }

  const loc = locale.value;
  const author = msg.author >= 0 ? authors.value[msg.author] : '';
  const btn = 'grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white';

  return (
    <div class="fixed inset-0 z-50 flex flex-col bg-[#0b141a] text-white" role="dialog" aria-modal="true">
      <div class="flex h-16 shrink-0 items-center gap-3 px-4">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{author}</div>
          <div class="text-xs text-white/60">
            {formatDateLong(msg.ts, loc)} {formatTime(msg.ts, loc)}
          </div>
        </div>
        <button
          type="button"
          class="rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => {
            lightbox.value = null;
            panel.value = window.matchMedia('(max-width: 767px)').matches ? null : panel.value;
            scrollToMessage(id);
          }}
        >
          {d.goToMessage}
        </button>
        {url && (
          <a href={url} download={msg.media.name} class={btn} title={d.download} aria-label={d.download}>
            <DownloadIcon />
          </a>
        )}
        <button type="button" class={btn} onClick={() => (lightbox.value = null)} title={d.close} aria-label={d.close}>
          <CloseIcon />
        </button>
      </div>
      <div class="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6" onClick={(e) => e.target === e.currentTarget && (lightbox.value = null)}>
        {lb.pos > 0 && (
          <button type="button" class={`${btn} absolute left-2`} onClick={() => move(-1)} aria-label={d.prev}>
            <LeftIcon />
          </button>
        )}
        {url &&
          (msg.media.kind === 'video' ? (
            <video src={url} controls autoplay playsInline class="max-h-full max-w-full" />
          ) : (
            <img src={url} alt="" class="max-h-full max-w-full object-contain" />
          ))}
        {lb.pos < lb.ids.length - 1 && (
          <button type="button" class={`${btn} absolute right-2`} onClick={() => move(1)} aria-label={d.next}>
            <RightIcon />
          </button>
        )}
      </div>
      {msg.text && <p class="mx-auto max-w-2xl shrink-0 px-6 pb-6 text-center text-sm text-white/90">{msg.text}</p>}
    </div>
  );
}

export function PdfDialog() {
  const d = dict.value;
  const hasMedia = (media.value?.size ?? 0) > 0;
  const [images, setImages] = useState(true);
  if (!pdfOpen.value) return null;
  const n = filtered.value.length;

  return (
    <div class="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4 print:hidden" role="dialog" aria-modal="true">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-wa-panel-dark">
        <h2 class="text-lg font-medium">{d.pdfTitle}</h2>
        <p class="mt-2 text-sm text-wa-muted dark:text-[#aebac1]">{tpl(d.pdfInfo, { n: formatNumber(n, locale.value) })}</p>
        {n > PDF_WARN_AT && (
          <p class="mt-3 rounded-lg bg-[#fff4d6] p-3 text-sm text-[#7a5c00] dark:bg-[#3a3113] dark:text-[#ffd279]">{d.pdfWarn}</p>
        )}
        {hasMedia && (
          <label class="mt-4 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={images} onChange={(e) => setImages(e.currentTarget.checked)} class="size-4 accent-wa-teal" />
            {d.pdfImages}
          </label>
        )}
        <p class="mt-4 text-xs text-wa-muted dark:text-[#8696a0]">{d.pdfHint}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => (pdfOpen.value = false)}
            class="rounded-full px-5 py-2 text-sm font-semibold text-wa-teal hover:bg-wa-teal/5"
          >
            {d.cancel}
          </button>
          <button
            type="button"
            disabled={!n}
            onClick={() => {
              pdfOpen.value = false;
              printing.value = { images: hasMedia && images };
            }}
            class="rounded-full bg-wa-teal px-5 py-2 text-sm font-semibold text-white hover:bg-wa-teal-dark disabled:opacity-50"
          >
            {d.pdfGenerate}
          </button>
        </div>
      </div>
    </div>
  );
}
