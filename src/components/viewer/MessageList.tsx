import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions,
} from '@tanstack/virtual-core';
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import { formatDayChip } from '../../lib/format';
import type { Message } from '../../lib/parser/types';
import { chat, dict, filtered, flashId, isGroup, locale, messages, rows, scrollTarget } from '../../lib/store';
import { DownIcon } from './icons';
import { DateChip, MessageRow } from './MessageRow';

type Opts = Omit<
  VirtualizerOptions<HTMLDivElement, HTMLDivElement>,
  'observeElementRect' | 'observeElementOffset' | 'scrollToFn' | 'onChange'
>;

function useVirtualizer(options: Opts) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const resolved: VirtualizerOptions<HTMLDivElement, HTMLDivElement> = {
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options,
    onChange: () => rerender(0),
  };
  const [instance] = useState(() => new Virtualizer(resolved));
  instance.setOptions(resolved);
  useLayoutEffect(() => instance._didMount(), []);
  useLayoutEffect(() => instance._willUpdate());
  return instance;
}

function estimate(value: number, msgs: Message[], group: boolean): number {
  if (value < 0) return 45;
  const m = msgs[value];
  if (m.type === 'system') return 45 + Math.floor(m.text.length / 70) * 21;
  let h = 29 + (group ? 22 : 0);
  if (m.type === 'media') {
    const k = m.media!.kind;
    h += k === 'image' || k === 'video' ? 230 : k === 'sticker' ? 150 : k === 'audio' ? 30 : 50;
  }
  if (m.text) {
    let lines = 0;
    for (const part of m.text.split('\n')) lines += Math.max(1, Math.ceil(part.length / 48));
    h += (lines - 1) * 19;
  }
  return h;
}

export function MessageList() {
  const parentRef = useRef<HTMLDivElement>(null);
  const { rows: r, rowOf } = rows.value;
  const msgs = messages.value;
  const group = isGroup.value;
  const d = dict.value;
  const [atBottom, setAtBottom] = useState(true);

  const v = useVirtualizer({
    count: r.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => estimate(r[i], msgs, group),
    getItemKey: (i) => r[i],
    overscan: 10,
    paddingStart: 8,
    paddingEnd: 16,
  });

  const chatVal = chat.value;
  const filteredVal = filtered.value;
  useLayoutEffect(() => {
    if (!r.length) return;
    v.scrollToIndex(r.length - 1, { align: 'end' });
    const id = requestAnimationFrame(() => v.scrollToIndex(r.length - 1, { align: 'end' }));
    return () => cancelAnimationFrame(id);
  }, [chatVal, filteredVal]);

  const target = scrollTarget.value;
  useEffect(() => {
    if (!target) return;
    const row = rowOf[target.id];
    if (row === undefined || row < 0) return;
    v.scrollToIndex(row, { align: 'center' });
    flashId.value = target.id;
    const t = setTimeout(() => (flashId.value = -1), 1500);
    return () => clearTimeout(t);
  }, [target]);

  const items = v.getVirtualItems();
  const offset = v.scrollOffset ?? 0;
  let stickyTs: number | null = null;
  if (v.isScrolling && offset > 40) {
    const first = items.find((it) => it.end > offset + 8);
    if (first) {
      const val = r[first.index];
      stickyTs = msgs[val < 0 ? -val - 1 : val]?.ts ?? null;
    }
  }

  const onScroll = () => {
    const el = parentRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (bottom !== atBottom) setAtBottom(bottom);
  };

  return (
    <div class="wa wa-bg relative min-h-0 flex-1">
      <div
        ref={parentRef}
        onScroll={onScroll}
        class="scroll-thin absolute inset-0 overflow-y-auto overscroll-contain"
        style={{ contain: 'strict' }}
      >
        <div style={{ height: v.getTotalSize(), width: '100%', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${items[0]?.start ?? 0}px)`,
            }}
          >
            {items.map((it) => {
              const val = r[it.index];
              const prevVal = it.index > 0 ? r[it.index - 1] : -1;
              return (
                <div key={it.key} data-index={it.index} ref={v.measureElement}>
                  {val < 0 ? (
                    <DateChip ts={msgs[-val - 1].ts} />
                  ) : (
                    <MessageRow msg={msgs[val]} prev={prevVal >= 0 ? msgs[prevVal] : null} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {stickyTs !== null && (
        <div class="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <span class="wa-chip date">{formatDayChip(stickyTs, locale.value, d.today, d.yesterday)}</span>
        </div>
      )}

      {!atBottom && (
        <button
          type="button"
          onClick={() => v.scrollToIndex(r.length - 1, { align: 'end', behavior: 'auto' })}
          class="absolute right-5 bottom-5 z-10 grid size-11 place-items-center rounded-full bg-white text-wa-muted shadow-md hover:text-wa-ink dark:bg-wa-panel-dark dark:text-[#aebac1]"
          aria-label="↓"
        >
          <DownIcon />
        </button>
      )}
    </div>
  );
}
