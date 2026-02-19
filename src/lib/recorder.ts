export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private stream: MediaStream | null = null;

    async start(): Promise<void> {
        this.chunks = [];
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: this.getSupportedMimeType(),
        });
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.mediaRecorder.start();
    }

    stop(): Promise<{ blob: Blob; base64: string }> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error("Recorder not started"));
                return;
            }
            this.mediaRecorder.onstop = async () => {
                const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
                const blob = new Blob(this.chunks, { type: mimeType });
                this.cleanup();
                const base64 = await this.blobToBase64(blob);
                resolve({ blob, base64 });
            };
            this.mediaRecorder.stop();
        });
    }

    get isRecording(): boolean {
        return this.mediaRecorder?.state === "recording";
    }

    private cleanup(): void {
        if (this.stream) {
            this.stream.getTracks().forEach((t) => t.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.chunks = [];
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private getSupportedMimeType(): string {
        const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return "audio/webm";
    }
}

/* ===== File System Access API for saving to PC ===== */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
        const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        return handle;
    } catch {
        return null;
    }
}

export async function saveAudioToDirectory(
    dirHandle: FileSystemDirectoryHandle,
    blob: Blob,
    filename: string
): Promise<void> {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

export function generateFilename(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `karte_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.webm`;
}

/* ===== Directory handle persistence via IndexedDB ===== */
const DB_NAME = "byok-karte-fs";
const STORE_NAME = "handles";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, "audioDir");
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get("audioDir");
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}
