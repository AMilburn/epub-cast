// IndexedDB for book file persistence, localStorage for playback position

const DB_NAME = "epub-cast";
const STORE = "books";
const DB_VERSION = 1;

export interface StoredBook {
    name: string;
    size: number;
    type: string;
    savedAt: number;
    coverDataUrl?: string;
}

export interface SavedPosition {
    chapterHref: string;
    chapterLabel: string;
    currentTime: number;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE, { keyPath: "name" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveBook(file: File): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({
            name: file.name,
            size: file.size,
            type: file.type,
            blob: file,
            savedAt: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAllBooks(): Promise<StoredBook[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () =>
            resolve(
                req.result
                    .map(({ blob: _blob, ...rest }: any) => rest as StoredBook)
                    .sort((a, b) => b.savedAt - a.savedAt)
            );
        req.onerror = () => reject(req.error);
    });
}

export async function getBook(name: string): Promise<File | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(name);
        req.onsuccess = () => {
            const record = req.result;
            if (!record) return resolve(null);
            resolve(new File([record.blob], record.name, { type: record.type }));
        };
        req.onerror = () => reject(req.error);
    });
}

export async function updateBookCover(name: string, coverDataUrl: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.get(name);
        req.onsuccess = () => {
            if (!req.result) return resolve();
            store.put({ ...req.result, coverDataUrl });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteBook(name: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(name);
        tx.oncomplete = () => {
            clearPosition(name);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

// --- Position (localStorage) ---

const positionKey = (filename: string) => `epub-cast:pos:${filename}`;

export function savePosition(filename: string, position: SavedPosition): void {
    try {
        localStorage.setItem(positionKey(filename), JSON.stringify(position));
    } catch {
        // ignore quota errors
    }
}

export function getPosition(filename: string): SavedPosition | null {
    try {
        const raw = localStorage.getItem(positionKey(filename));
        return raw ? (JSON.parse(raw) as SavedPosition) : null;
    } catch {
        return null;
    }
}

export function clearPosition(filename: string): void {
    localStorage.removeItem(positionKey(filename));
}
