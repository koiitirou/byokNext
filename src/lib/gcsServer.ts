/**
 * Server-side GCS authentication and operations.
 * Uses the admin's service account key from GCS_SERVICE_ACCOUNT_KEY env var.
 * This module runs ONLY on the server (API routes).
 */

const BUCKET = "byok-next";
const GCS_BASE = "https://storage.googleapis.com";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/devstorage.full_control";

interface ServiceAccountKey {
    project_id: string;
    private_key: string;
    client_email: string;
    token_uri: string;
}

// ===== Token cache =====
let cachedToken: { token: string; expiresAt: number } | null = null;

function getServiceAccountKey(): ServiceAccountKey {
    const raw = process.env.GCS_SERVICE_ACCOUNT_KEY;
    if (!raw) {
        throw new Error("GCS_SERVICE_ACCOUNT_KEY environment variable is not set");
    }
    return JSON.parse(raw);
}

// ===== JWT signing (Node.js crypto) =====
async function signJWT(key: ServiceAccountKey): Promise<string> {
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: key.client_email,
        scope: SCOPE,
        aud: TOKEN_URI,
        iat: now,
        exp: now + 3600,
    };

    const toBase64Url = (obj: object) =>
        Buffer.from(JSON.stringify(obj))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

    const headerB64 = toBase64Url(header);
    const payloadB64 = toBase64Url(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    // Use Node.js crypto
    const crypto = await import("crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingInput);
    const signature = sign
        .sign(key.private_key, "base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    return `${signingInput}.${signature}`;
}

// ===== Get access token =====
async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
        return cachedToken.token;
    }

    const key = getServiceAccountKey();
    const jwt = await signJWT(key);

    const res = await fetch(TOKEN_URI, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GCS token error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
}

// ===== GCS operations =====
export async function gcsUpload(objectName: string, body: string, contentType = "application/json"): Promise<void> {
    const token = await getAccessToken();
    const encodedName = encodeURIComponent(objectName);
    const url = `${GCS_BASE}/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodedName}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": contentType,
        },
        body,
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GCS upload error (${res.status}): ${errText}`);
    }
}

export async function gcsDownload(objectName: string): Promise<string> {
    const token = await getAccessToken();
    const encodedName = encodeURIComponent(objectName);
    const url = `${GCS_BASE}/storage/v1/b/${BUCKET}/o/${encodedName}?alt=media`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        if (res.status === 404) return "";
        const errText = await res.text();
        throw new Error(`GCS download error (${res.status}): ${errText}`);
    }
    return res.text();
}

interface GcsListItem {
    name: string;
    size?: string;
    updated?: string;
}

export async function gcsList(prefix: string): Promise<GcsListItem[]> {
    const token = await getAccessToken();
    const items: GcsListItem[] = [];
    let pageToken = "";
    do {
        const url = `${GCS_BASE}/storage/v1/b/${BUCKET}/o?prefix=${encodeURIComponent(prefix)}&maxResults=500${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`GCS list error (${res.status}): ${errText}`);
        }
        const data = await res.json();
        if (data.items) items.push(...data.items);
        pageToken = data.nextPageToken || "";
    } while (pageToken);
    return items;
}

export async function gcsDelete(objectName: string): Promise<void> {
    const token = await getAccessToken();
    const encodedName = encodeURIComponent(objectName);
    const url = `${GCS_BASE}/storage/v1/b/${BUCKET}/o/${encodedName}`;
    await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
}
