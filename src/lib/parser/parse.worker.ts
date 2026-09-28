/// <reference lib="webworker" />
import { parseChat } from './parse';

export type WorkerRequest = { source: Blob | string };
export type WorkerResponse =
  | { ok: true; chat: ReturnType<typeof parseChat> }
  | { ok: false; error: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  try {
    const { source } = e.data;
    const text = typeof source === 'string' ? source : await source.text();
    const chat = parseChat(text);
    (self as unknown as Worker).postMessage({ ok: true, chat } satisfies WorkerResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) } satisfies WorkerResponse);
  }
};
