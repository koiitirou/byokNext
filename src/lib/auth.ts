/**
 * Service Account Key authentication for Vertex AI.
 * Handles JWT signing (Web Crypto API) and access token retrieval.
 * key.json file handles are persisted in IndexedDB.
 */

// ===== Types =====
export interface ServiceAccountKey {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
}

interface TokenCache {
    accessToken: string;
    expiresAt: number; // epoch ms
}

let cachedToken: TokenCache | null = null;

// ===== IndexedDB for file handle persistence =====
const DB_NAME = "shabecal-auth";
const STORE_NAME = "handles";
const HANDLE_KEY = "keyFileHandle";

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

export async function saveKeyFileHandle(handle: FileSystemFileHandle): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadKeyFileHandle(): Promise<FileSystemFileHandle | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
}

export async function clearKeyFileHandle(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ===== File Picker =====
export async function pickKeyFile(): Promise<FileSystemFileHandle | null> {
    try {
        const [handle] = await (window as any).showOpenFilePicker({
            types: [
                {
                    description: "Service Account Key",
                    accept: { "application/json": [".json"] },
                },
            ],
            multiple: false,
        });
        return handle;
    } catch {
        // User cancelled
        return null;
    }
}

export async function readKeyFile(handle: FileSystemFileHandle): Promise<ServiceAccountKey> {
    const perm = await (handle as any).requestPermission({ mode: "read" });
    if (perm !== "granted") {
        throw new Error("ファイルの読み取り権限が拒否されました。");
    }
    const file = await handle.getFile();
    const text = await file.text();
    const key = JSON.parse(text) as ServiceAccountKey;
    if (!key.project_id || !key.private_key || !key.client_email) {
        throw new Error("key.json の形式が正しくありません。service account key を指定してください。");
    }
    return key;
}

// ===== JWT + Access Token =====
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const TOKEN_URI = "https://oauth2.googleapis.com/token";

function base64url(data: Uint8Array): string {
    let binary = "";
    for (const byte of data) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBase64url(str: string): string {
    return base64url(new TextEncoder().encode(str));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/[\r\n\s]/g, "");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function signJWT(key: ServiceAccountKey): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: key.client_email,
        scope: SCOPE,
        aud: TOKEN_URI,
        iat: now,
        exp: now + 3600,
    };

    const headerB64 = strToBase64url(JSON.stringify(header));
    const payloadB64 = strToBase64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(key.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        new TextEncoder().encode(signingInput)
    );

    const sigB64 = base64url(new Uint8Array(signature));
    return `${signingInput}.${sigB64}`;
}

export async function getAccessToken(key: ServiceAccountKey): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
        return cachedToken.accessToken;
    }

    const jwt = await signJWT(key);

    const res = await fetch(TOKEN_URI, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`アクセストークンの取得に失敗しました (${res.status}): ${errText}`);
    }

    const data = await res.json();
    cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.accessToken;
}
