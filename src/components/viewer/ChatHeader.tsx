import type { ComponentChildren } from 'preact';
import { authorColor, formatNumber, initials, tpl } from '../../lib/format';
import {
  authors,
  chatName,
  clearFilters,
  dict,
  filtered,
  filtersActive,
  isGroup,
  locale,
  me,
  messages,
  panel,
  pdfOpen,
  type Panel,
} from '../../lib/store';
import { FilterIcon, FolderIcon, ImageIcon, PdfIcon, SearchIcon } from './icons';

export function useDisplayName(): string {
  const d = dict.value;
  const a = authors.value;
  if (chatName.value) return chatName.value;
  if (a.length === 2) return me.value >= 0 ? a[1 - me.value] : `${a[0]} & ${a[1]}`;
  if (a.length === 1) return a[0];
  return d.group;
}

function HeaderButton(props: {
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: boolean;
  children: ComponentChildren;
}) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={props.onClick}
      class={`relative grid size-10 place-items-center rounded-full text-[#54656f] transition hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/10 ${props.active ? 'bg-black/10 dark:bg-white/10' : ''}`}
    >
      {props.children}
      {props.badge && <span class="absolute top-2 right-2 size-2 rounded-full bg-wa-teal" />}
    </button>
  );
}

export function ChatHeader({ onOpenFile }: { onOpenFile: () => void }) {
  const d = dict.value;
  const name = useDisplayName();
  const a = authors.value;
  const loc = locale.value;
  const subtitle = isGroup.value
    ? a.join(', ')
    : `${formatNumber(messages.value.length, loc)} ${d.messages}`;
  const toggle = (p: Panel) => (panel.value = panel.value === p ? null : p);

  return (
    <>
      <header class="flex h-[59px] shrink-0 items-center gap-3 bg-wa-panel px-4 dark:bg-wa-panel-dark">
        <div
          class="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
          style={{ background: isGroup.value ? '#8696a0' : authorColor(name) }}
          aria-hidden="true"
        >
          {isGroup.value ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.3 0-7 1.6-7 4v2h14v-2c0-2.4-3.7-4-7-4zm7 0c-.5 0-1 0-1.6.1 1.6.9 2.6 2.2 2.6 3.9v2h5v-2c0-2.4-3.2-4-6-4z" />
            </svg>
          ) : (
            initials(name)
          )}
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base leading-5 text-wa-ink dark:text-[#e9edef]">{name}</h1>
          <p class="truncate text-[13px] leading-5 text-wa-muted dark:text-[#8696a0]">
            {isGroup.value ? `${a.length} ${d.participants}: ${subtitle}` : subtitle}
          </p>
        </div>
        <nav class="flex shrink-0 items-center gap-0.5">
          <HeaderButton label={d.search} active={panel.value === 'search'} onClick={() => toggle('search')}>
            <SearchIcon width={20} height={20} />
          </HeaderButton>
          <HeaderButton
            label={d.filters}
            active={panel.value === 'filters'}
            badge={filtersActive.value}
            onClick={() => toggle('filters')}
          >
            <FilterIcon width={20} height={20} />
          </HeaderButton>
          <HeaderButton label={d.media} active={panel.value === 'media'} onClick={() => toggle('media')}>
            <ImageIcon width={20} height={20} />
          </HeaderButton>
          <HeaderButton label={d.exportPdf} onClick={() => (pdfOpen.value = true)}>
            <PdfIcon width={20} height={20} />
          </HeaderButton>
          <HeaderButton label={d.openAnother} onClick={onOpenFile}>
            <FolderIcon width={20} height={20} />
          </HeaderButton>
        </nav>
      </header>
      {filtersActive.value && (
        <div class="flex shrink-0 items-center justify-center gap-3 border-b border-black/5 bg-[#fff8e1] px-4 py-1.5 text-[13px] text-[#54656f] dark:border-white/5 dark:bg-[#182229] dark:text-[#aebac1]">
          <span>
            {tpl(d.showing, {
              n: formatNumber(filtered.value.length, loc),
              total: formatNumber(messages.value.length, loc),
            })}
          </span>
          <button type="button" onClick={clearFilters} class="font-semibold text-wa-teal hover:underline">
            {d.clearFilters}
          </button>
        </div>
      )}
    </>
  );
}
