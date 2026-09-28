import { useEffect, useRef, useState } from 'preact/hooks';
import { formatDateLong, formatNumber } from '../../lib/format';
import { dict, filtered, locale, media, messages, printing, rows } from '../../lib/store';
import { DateChip, MessageRow, PrintContext } from './MessageRow';
import { useDisplayName } from './ChatHeader';

const CONCURRENCY = 6;

async function waitForImages(root: HTMLElement) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(
    imgs.map((img) =>
      img.complete ? img.decode?.().catch(() => {}) : new Promise<void>((r) => {
        img.onload = img.onerror = () => r();
      }),
    ),
  );
}

export function PrintView() {
  const job = printing.value;
  const d = dict.value;
  const name = useDisplayName();
  const rootRef = useRef<HTMLDivElement>(null);
  const [urls, setUrls] = useState<Map<string, string> | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    setReady(false);
    setUrls(null);
    const store = media.value;
    const msgs = messages.value;
    const names: string[] = [];
    if (job.images && store) {
      for (const i of filtered.value) {
        const m = msgs[i].media;
        if (m && (m.kind === 'image' || m.kind === 'sticker') && store.has(m.name)) names.push(m.name);
      }
    }
    setProgress([0, names.length]);
    const map = new Map<string, string>();
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (!cancelled && next < names.length) {
        const n = names[next++];
        const u = await store!.url(n, true);
        if (u) map.set(n, u);
        done++;
        if (done % 10 === 0 || done === names.length) setProgress([done, names.length]);
      }
    };
    Promise.all(Array.from({ length: CONCURRENCY }, worker)).then(() => {
      if (!cancelled) setUrls(map);
    });

    const prevTitle = document.title;
    const onAfter = () => {
      document.title = prevTitle;
      store?.unpinAll();
      printing.value = null;
    };
    window.addEventListener('afterprint', onAfter);
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', onAfter);
      document.title = prevTitle;
    };
  }, [job]);

  useEffect(() => {
    if (!job || !urls || !rootRef.current) return;
    let cancelled = false;
    waitForImages(rootRef.current).then(() => {
      if (cancelled) return;
      setReady(true);
      document.title = name;
      requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelled = true;
    };
  }, [urls]);

  if (!job) return null;

  const msgs = messages.value;
  const f = filtered.value;
  const loc = locale.value;
  const { rows: r } = rows.value;
  const [done, total] = progress;

  return (
    <>
      <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 print:hidden">
        <div class="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-wa-panel-dark">
          <div class="mx-auto mb-4 size-9 animate-spin rounded-full border-4 border-wa-teal/20 border-t-wa-teal" />
          <p class="text-sm">{d.pdfPreparing}</p>
          {total > 0 && !urls && (
            <p class="mt-1 text-xs text-wa-muted">
              {done} / {total}
            </p>
          )}
          {ready && <p class="mt-3 text-xs text-wa-muted">{d.pdfHint}</p>}
          <button
            type="button"
            onClick={() => {
              media.value?.unpinAll();
              printing.value = null;
            }}
            class="mt-4 rounded-full px-4 py-1.5 text-sm font-semibold text-wa-teal hover:bg-wa-teal/5"
          >
            {ready ? d.close : d.cancel}
          </button>
        </div>
      </div>

      {urls && (
        <div ref={rootRef} class="hidden print:block">
          <div class="mb-4 border-b border-black/10 pb-3 text-[#111b21]">
            <h1 class="text-xl font-semibold">{name}</h1>
            <p class="text-xs text-[#667781]">
              {f.length > 0 &&
                `${formatDateLong(msgs[f[0]].ts, loc)} – ${formatDateLong(msgs[f[f.length - 1]].ts, loc)} · `}
              {formatNumber(f.length, loc)} {d.messages}
            </p>
          </div>
          <PrintContext.Provider value={{ urls: job.images ? urls : null }}>
            <div class="wa wa-print">
              {Array.from(r, (val, idx) => {
                if (val < 0) return <DateChip key={val} ts={msgs[-val - 1].ts} />;
                const prevVal = idx > 0 ? r[idx - 1] : -1;
                return <MessageRow key={val} msg={msgs[val]} prev={prevVal >= 0 ? msgs[prevVal] : null} />;
              })}
            </div>
          </PrintContext.Provider>
          <p class="mt-6 text-center text-[10px] text-[#667781]">{d.exportedWith} · whatsappviewer.zenvixlabs.app</p>
        </div>
      )}
    </>
  );
}
