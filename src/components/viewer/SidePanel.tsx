import { batch } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayStart, toYmd } from '../../lib/filter';
import { authorColor, formatDate, formatNumber, initials, tpl } from '../../lib/format';
import { normalizeForSearch } from '../../lib/parser/parse';
import {
  authors,
  chat,
  clearFilters,
  dateFrom,
  dateTo,
  dict,
  filtered,
  lightbox,
  locale,
  matches,
  matchPos,
  me,
  media,
  mediaIds,
  messages,
  panel,
  query,
  scrollToMessage,
  selectedAuthors,
  setMe,
} from '../../lib/store';
import { CloseIcon, DownIcon, UpIcon } from './icons';
import { RichText } from './RichText';

const MAX_RESULTS = 500;
const isNarrow = () => window.matchMedia('(max-width: 767px)').matches;

function goToMatch(pos: number) {
  const m = matches.value;
  if (!m.length) return;
  const p = Math.min(Math.max(pos, 0), m.length - 1);
  matchPos.value = p;
  scrollToMessage(m[p]);
}

function SearchPanel() {
  const d = dict.value;
  const loc = locale.value;
  const [text, setText] = useState(query.value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      batch(() => {
        query.value = text;
        matchPos.value = -1;
      });
    }, 150);
    return () => clearTimeout(t);
  }, [text]);

  const m = matches.value;
  const pos = matchPos.value;
  const msgs = messages.value;
  const names = authors.value;
  const q = query.value.trim();
  const nq = normalizeForSearch(q);

  const step = (dir: -1 | 1) => {
    if (!m.length) return;
    if (pos < 0) return goToMatch(m.length - 1);
    goToMatch(pos + dir);
  };

  const results = useMemo(() => {
    const out: number[] = [];
    for (let k = m.length - 1; k >= 0 && out.length < MAX_RESULTS; k--) out.push(k);
    return out;
  }, [m]);

  return (
    <>
      <div class="flex items-center gap-2 border-b border-wa-line px-3 py-2 dark:border-wa-line-dark">
        <input
          ref={inputRef}
          type="search"
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') step(e.shiftKey ? 1 : -1);
          }}
          placeholder={d.searchPlaceholder}
          class="h-9 min-w-0 flex-1 rounded-lg bg-wa-panel px-3 text-sm outline-none placeholder:text-wa-muted focus:ring-2 focus:ring-wa-teal/40 dark:bg-wa-panel-dark dark:placeholder:text-[#8696a0]"
        />
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!m.length}
          title={d.prev}
          aria-label={d.prev}
          class="grid size-8 place-items-center rounded-full text-wa-muted hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          <UpIcon width={20} height={20} />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!m.length}
          title={d.next}
          aria-label={d.next}
          class="grid size-8 place-items-center rounded-full text-wa-muted hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          <DownIcon width={20} height={20} />
        </button>
      </div>
      <div class="px-4 py-2 text-xs text-wa-muted dark:text-[#8696a0]">
        {!q
          ? d.searchEmpty
          : !m.length
            ? d.noResults
            : pos >= 0
              ? `${formatNumber(pos + 1, loc)} ${d.resultsOf} ${formatNumber(m.length, loc)}`
              : `${formatNumber(m.length, loc)}`}
      </div>
      <ul class="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {results.map((k) => {
          const msg = msgs[m[k]];
          const idx = msg.norm.indexOf(nq);
          const start = Math.max(0, (idx > -1 ? idx : 0) - 40);
          const end = Math.min(msg.text.length, start + 160);
          return (
            <li key={msg.id}>
              <button
                type="button"
                onClick={() => {
                  goToMatch(k);
                  if (isNarrow()) panel.value = null;
                }}
                class={`block w-full border-b border-wa-line px-4 py-3 text-left hover:bg-wa-panel dark:border-wa-line-dark dark:hover:bg-wa-panel-dark ${k === pos ? 'bg-wa-panel dark:bg-wa-panel-dark' : ''}`}
              >
                <div class="text-xs text-wa-muted dark:text-[#8696a0]">
                  {formatDate(msg.ts, loc)}
                  {msg.author >= 0 && ` · ${names[msg.author]}`}
                </div>
                <div class="mt-0.5 line-clamp-2 text-sm text-wa-ink dark:text-[#e9edef]">
                  {start > 0 && '…'}
                  <RichText text={msg.text.slice(start, end)} norm={msg.norm.slice(start, end)} query={query.value} />
                </div>
              </button>
            </li>
          );
        })}
        {m.length > MAX_RESULTS && (
          <li class="px-4 py-3 text-xs text-wa-muted">{tpl(d.moreResults, { n: MAX_RESULTS })}</li>
        )}
      </ul>
    </>
  );
}

function Section(props: { title: string; children: preact.ComponentChildren; action?: preact.ComponentChildren }) {
  return (
    <section class="border-b border-wa-line px-5 py-4 dark:border-wa-line-dark">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium text-wa-teal">{props.title}</h3>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}

const inputCls =
  'h-9 w-full rounded-lg border border-wa-line bg-white px-2 text-sm outline-none focus:border-wa-teal dark:border-wa-line-dark dark:bg-wa-panel-dark dark:[color-scheme:dark]';

function FiltersPanel() {
  const d = dict.value;
  const loc = locale.value;
  const c = chat.value!;
  const msgs = c.messages;
  const minDay = msgs.length ? toYmd(msgs[0].ts) : '';
  const maxDay = msgs.length ? toYmd(msgs[msgs.length - 1].ts) : '';
  const [jump, setJump] = useState('');
  const sel = selectedAuthors.value;

  const order = useMemo(
    () => c.authors.map((_, i) => i).sort((a, b) => c.counts[b] - c.counts[a]),
    [c],
  );

  const toggleAuthor = (i: number) => {
    const next = new Set(sel ?? c.authors.map((_, k) => k));
    if (next.has(i)) next.delete(i);
    else next.add(i);
    selectedAuthors.value = next.size === c.authors.length ? null : next;
  };

  const doJump = () => {
    if (!jump) return;
    const ts = dayStart(jump);
    const f = filtered.value;
    for (const i of f) {
      if (msgs[i].ts >= ts) {
        scrollToMessage(i);
        if (isNarrow()) panel.value = null;
        return;
      }
    }
    if (f.length) scrollToMessage(f[f.length - 1]);
  };

  return (
    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <Section title={d.period}>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-xs text-wa-muted dark:text-[#8696a0]">
            {d.dateFrom}
            <input
              type="date"
              class={inputCls + ' mt-1'}
              min={minDay}
              max={dateTo.value || maxDay}
              value={dateFrom.value}
              onChange={(e) => (dateFrom.value = e.currentTarget.value)}
            />
          </label>
          <label class="text-xs text-wa-muted dark:text-[#8696a0]">
            {d.dateTo}
            <input
              type="date"
              class={inputCls + ' mt-1'}
              min={dateFrom.value || minDay}
              max={maxDay}
              value={dateTo.value}
              onChange={(e) => (dateTo.value = e.currentTarget.value)}
            />
          </label>
        </div>
      </Section>

      <Section title={d.jumpTo}>
        <div class="flex gap-2">
          <input
            type="date"
            class={inputCls}
            min={minDay}
            max={maxDay}
            value={jump}
            onChange={(e) => setJump(e.currentTarget.value)}
          />
          <button
            type="button"
            onClick={doJump}
            class="h-9 shrink-0 rounded-lg bg-wa-teal px-4 text-sm font-semibold text-white hover:bg-wa-teal-dark"
          >
            {d.go}
          </button>
        </div>
      </Section>

      {c.authors.length > 1 && (
        <Section title={d.whoLabel}>
          <select
            class={inputCls}
            value={String(me.value)}
            onChange={(e) => setMe(Number(e.currentTarget.value))}
          >
            <option value="-1">{d.whoNone}</option>
            {order.map((i) => (
              <option value={String(i)}>{c.authors[i]}</option>
            ))}
          </select>
        </Section>
      )}

      <Section
        title={d.people}
        action={
          <div class="flex gap-3 text-xs font-semibold text-wa-teal">
            <button type="button" onClick={() => (selectedAuthors.value = null)} class="hover:underline">
              {d.all}
            </button>
            <button type="button" onClick={() => (selectedAuthors.value = new Set())} class="hover:underline">
              {d.none}
            </button>
          </div>
        }
      >
        <ul class="-mx-2">
          {order.map((i) => {
            const name = c.authors[i];
            const checked = !sel || sel.has(i);
            return (
              <li key={i}>
                <label class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-wa-panel dark:hover:bg-wa-panel-dark">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAuthor(i)}
                    class="size-4 accent-wa-teal"
                  />
                  <span
                    class="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: authorColor(name) }}
                  >
                    {initials(name)}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-sm">{name}</span>
                  <span class="text-xs text-wa-muted dark:text-[#8696a0]">{formatNumber(c.counts[i], loc)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <div class="px-5 py-4">
        <p class="mb-3 text-xs text-wa-muted dark:text-[#8696a0]">
          {tpl(d.showing, {
            n: formatNumber(filtered.value.length, loc),
            total: formatNumber(messages.value.length, loc),
          })}
        </p>
        <button
          type="button"
          onClick={clearFilters}
          class="w-full rounded-lg border border-wa-teal py-2 text-sm font-semibold text-wa-teal hover:bg-wa-teal/5"
        >
          {d.clearFilters}
        </button>
      </div>
    </div>
  );
}

function MediaThumb({ id }: { id: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const msg = messages.value[id];
  const store = media.value;

  useEffect(() => {
    const el = ref.current;
    if (!el || !store) return;
    let alive = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          store.url(msg.media!.name).then((u) => alive && setUrl(u));
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [id, store]);

  const open = () => {
    const ids = mediaIds.value.filter((i) => store?.has(messages.value[i].media!.name));
    lightbox.value = { ids, pos: Math.max(0, ids.indexOf(id)) };
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={open}
      class="relative aspect-square overflow-hidden rounded bg-wa-panel dark:bg-wa-panel-dark"
    >
      {url &&
        (msg.media!.kind === 'video' ? (
          <video src={url} preload="metadata" muted class="size-full object-cover" />
        ) : (
          <img src={url} alt="" decoding="async" class="size-full object-cover" />
        ))}
      {msg.media!.kind === 'video' && (
        <span class="absolute right-1 bottom-1 rounded bg-black/60 px-1 text-[10px] text-white">▶</span>
      )}
    </button>
  );
}

function MediaPanel() {
  const d = dict.value;
  const store = media.value;
  const ids = mediaIds.value;
  const available = store ? ids.filter((i) => store.has(messages.value[i].media!.name)) : [];

  if (!ids.length) return <p class="p-6 text-center text-sm text-wa-muted">{d.noMedia}</p>;
  if (!available.length) return <p class="p-6 text-center text-sm text-wa-muted">{d.noMediaFiles}</p>;

  return (
    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-3 gap-1.5">
        {available.map((id) => (
          <MediaThumb key={id} id={id} />
        ))}
      </div>
    </div>
  );
}

export function SidePanel() {
  const d = dict.value;
  const p = panel.value;
  if (!p) return null;
  const title = p === 'search' ? d.searchPlaceholder : p === 'filters' ? d.filters : d.media;

  const close = () => {
    if (p === 'search') {
      batch(() => {
        query.value = '';
        matchPos.value = -1;
      });
    }
    panel.value = null;
  };

  return (
    <aside class="absolute inset-0 z-20 flex flex-col bg-white md:static md:w-[380px] md:shrink-0 md:border-l md:border-wa-line dark:bg-wa-bg-dark md:dark:border-wa-line-dark">
      <div class="flex h-[59px] shrink-0 items-center gap-6 bg-wa-panel px-5 dark:bg-wa-panel-dark">
        <button
          type="button"
          onClick={close}
          aria-label={d.close}
          class="text-[#54656f] hover:text-wa-ink dark:text-[#aebac1] dark:hover:text-white"
        >
          <CloseIcon width={22} height={22} />
        </button>
        <h2 class="text-base">{title}</h2>
      </div>
      {p === 'search' && <SearchPanel />}
      {p === 'filters' && <FiltersPanel />}
      {p === 'media' && <MediaPanel />}
    </aside>
  );
}
