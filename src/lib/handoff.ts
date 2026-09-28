/** Passes files picked on the landing page to the viewer page, locally via IndexedDB. */

const DB = 'wv-handoff';
const STORE = 'files';
const KEY = 'pending';
export const HANDOFF_HASH = '#open';
export const ACCEPT = '.txt,.zip,application/zip,text/plain,image/*,video/*,audio/*,.opus,.pdf,.vcf';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function stashFiles(files: File[]): Promise<void> {
  const db = await openDb();
  try {
    await run(db, 'readwrite', (s) => s.put(files, KEY));
  } finally {
    db.close();
  }
}

export async function takeFiles(): Promise<File[] | null> {
  const db = await openDb();
  try {
    const files = await run<File[] | undefined>(db, 'readonly', (s) => s.get(KEY));
    await run(db, 'readwrite', (s) => s.delete(KEY));
    return files?.length ? files : null;
  } finally {
    db.close();
  }
}
