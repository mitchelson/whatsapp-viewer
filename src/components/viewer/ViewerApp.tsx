import { useEffect, useRef } from 'preact/hooks';
import { routes, type Lang } from '../../i18n';
import type { WorkerRequest, WorkerResponse } from '../../lib/parser/parse.worker';
import { chatNameFromFile } from '../../lib/parser/parse';
import type { ParsedChat } from '../../lib/parser/types';
import { chat, dict, errorMsg, lang, loadChat, status, type ViewerDict } from '../../lib/store';
import { OpenError, openFiles } from '../../lib/zip';
import { ChatHeader, useDisplayName } from './ChatHeader';
import { ACCEPT, Dropzone } from './Dropzone';
import { MessageList } from './MessageList';
import { Lightbox, PdfDialog, WhoAreYou } from './Overlays';
import { PrintView } from './PrintView';
import { SidePanel } from './SidePanel';

interface Props {
  initialLang: Lang;
  dicts: Record<Lang, ViewerDict>;
  titles: Record<Lang, string>;
}

function parseInWorker(source: Blob | string): Promise<ParsedChat> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../lib/parser/parse.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.chat);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };
    worker.postMessage({ source } satisfies WorkerRequest);
  });
}

async function handleFiles(files: File[]) {
  const d = dict.value;
  status.value = 'reading';
  try {
    const opened = await openFiles(files);
    status.value = 'parsing';
    const parsed = await parseInWorker(opened.source);
    if (!parsed.messages.length) {
      opened.media.dispose();
      throw new Error('empty');
    }
    loadChat(parsed, chatNameFromFile(opened.fileName), opened.media);
  } catch (err) {
    errorMsg.value =
      err instanceof OpenError
        ? err.code === 'noChat'
          ? d.errorNoChat
          : d.errorGeneric
        : err instanceof Error && err.message === 'empty'
          ? d.errorEmpty
          : d.errorGeneric;
    if (chat.value) {
      status.value = 'ready';
      alert(errorMsg.value);
    } else {
      status.value = 'error';
    }
  }
}

function ChatScreen({ onOpenFile }: { onOpenFile: () => void }) {
  const name = useDisplayName();
  useEffect(() => {
    document.title = `${name} | WhatsApp Viewer`;
  }, [name]);
  return (
    <div class="relative flex min-h-0 flex-1 print:hidden">
      <div class="flex min-w-0 flex-1 flex-col">
        <ChatHeader onOpenFile={onOpenFile} />
        <MessageList />
      </div>
      <SidePanel />
    </div>
  );
}

export default function ViewerApp({ initialLang, dicts, titles }: Props) {
  if (!dict.peek()) {
    lang.value = initialLang;
    dict.value = dicts[initialLang];
  }
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('[data-lang-switch]') : null;
      if (!el) return;
      e.preventDefault();
      const l = el.dataset.langSwitch as Lang;
      const other: Lang = l === 'pt' ? 'en' : 'pt';
      lang.value = l;
      dict.value = dicts[l];
      history.replaceState(null, '', routes[l].viewer);
      const html = document.documentElement;
      html.lang = l === 'pt' ? 'pt-BR' : 'en';
      html.dataset.lang = l;
      html.dataset.alt = routes[other].viewer;
      if (!chat.value) document.title = titles[l];
      document.querySelectorAll('[data-lang-switch]').forEach((a) => {
        if (a.getAttribute('data-lang-switch') === l) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      document.querySelectorAll<HTMLAnchorElement>('[data-home-link]').forEach((a) => (a.href = routes[l].home));
    };
    document.addEventListener('click', onClick, true);

    const onDragOver = (e: DragEvent) => {
      if (chat.value && e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!chat.value) return;
      e.preventDefault();
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) handleFiles(files);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const ready = status.value === 'ready' && chat.value;

  return (
    <>
      {ready ? <ChatScreen onOpenFile={() => inputRef.current?.click()} /> : <Dropzone onFiles={handleFiles} />}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        class="hidden"
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = '';
          if (files.length) handleFiles(files);
        }}
      />
      <WhoAreYou />
      <Lightbox />
      <PdfDialog />
      <PrintView />
    </>
  );
}
