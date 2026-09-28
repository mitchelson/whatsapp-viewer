import { useRef, useState } from 'preact/hooks';
import { dict, errorMsg, lang, status } from '../../lib/store';
import { LockIcon, UploadIcon } from './icons';

export const ACCEPT = '.txt,.zip,application/zip,text/plain,image/*,video/*,audio/*,.opus,.pdf,.vcf';

export function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const d = dict.value;
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = status.value === 'reading' || status.value === 'parsing';

  return (
    <div
      class="wa wa-bg flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...(e.dataTransfer?.files ?? [])];
        if (files.length) onFiles(files);
      }}
    >
      <div
        class={`w-full max-w-lg rounded-3xl bg-white/95 p-8 text-center shadow-xl ring-2 transition dark:bg-wa-panel-dark/95 ${over ? 'ring-wa-teal' : 'ring-transparent'}`}
      >
        {busy ? (
          <div class="py-10">
            <div class="mx-auto mb-5 size-12 animate-spin rounded-full border-4 border-wa-teal/20 border-t-wa-teal" />
            <p class="text-wa-muted dark:text-[#aebac1]">{status.value === 'reading' ? d.reading : d.parsing}</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              class="mx-auto grid size-20 place-items-center rounded-full bg-wa-teal/10 text-wa-teal transition hover:bg-wa-teal/20"
              aria-label={d.dropButton}
            >
              <UploadIcon width={36} height={36} />
            </button>
            <h1 class="mt-5 text-2xl font-light text-wa-ink dark:text-[#e9edef]">
              {over ? d.dropActive : d.dropTitle}
            </h1>
            <p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-wa-muted dark:text-[#aebac1]">{d.dropHint}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              class="mt-6 rounded-full bg-wa-teal px-7 py-2.5 font-semibold text-white shadow-sm transition hover:bg-wa-teal-dark"
            >
              {d.dropButton}
            </button>
            {status.value === 'error' && (
              <p class="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                {errorMsg.value}
              </p>
            )}
            <p class="mt-6 flex items-center justify-center gap-1.5 text-xs text-wa-muted dark:text-[#8696a0]">
              <LockIcon width={13} height={13} />
              {d.privacy}
            </p>
            <a
              href={(lang.value === 'pt' ? '/' : '/en') + '#how'}
              class="mt-2 inline-block text-xs font-medium text-wa-teal hover:underline"
            >
              {d.howLink}
            </a>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          class="hidden"
          onChange={(e) => {
            const files = [...(e.currentTarget.files ?? [])];
            e.currentTarget.value = '';
            if (files.length) onFiles(files);
          }}
        />
      </div>
    </div>
  );
}
