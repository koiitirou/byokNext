/**
 * Client-side GCS API — calls Next.js API routes.
 * The admin's GCS key is kept server-side; this module never sees it.
 */

import { getBrowserId } from "./browserId";

// ===== Types =====
export interface CloudPrompt {
    name: string;
    authorId: string;
    authorAlias: string;
    fileName: string;
    createdAt: string;
}

// ===== Public API =====

/**
 * Save a prompt to cloud via API.
 */
export async function savePromptToCloud(name: string, text: string, authorAlias?: string): Promise<void> {
    const browserId = getBrowserId();
    const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, browserId, authorAlias: authorAlias || "Anonymous" }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `保存に失敗しました (${res.status})`);
    }
}

/**
 * List all community prompts.
 */
export async function listCommunityPrompts(): Promise<{ prompts: CloudPrompt[] }> {
    const res = await fetch("/api/prompts");
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `読み込みに失敗しました (${res.status})`);
    }
    return res.json();
}

/**
 * Load the full text of a cloud prompt.
 */
export async function loadCloudPromptText(authorId: string, fileName: string): Promise<string> {
    const params = new URLSearchParams({ authorId, fileName });
    const res = await fetch(`/api/prompts/text?${params}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `読み込みに失敗しました (${res.status})`);
    }
    const data = await res.json();
    return data.text;
}

/**
 * Toggle like on a prompt. Returns new state.
 */
export async function toggleLike(authorId: string, fileName: string): Promise<{ liked: boolean; count: number }> {
    const browserId = getBrowserId();
    const res = await fetch("/api/prompts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId, fileName, browserId }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `いいねに失敗しました (${res.status})`);
    }
    return res.json();
}

/**
 * Get like info for a prompt.
 */
export async function getLikeInfo(authorId: string, fileName: string): Promise<{ liked: boolean; count: number }> {
    const browserId = getBrowserId();
    const params = new URLSearchParams({ authorId, fileName, browserId });
    const res = await fetch(`/api/prompts/like?${params}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `いいね情報の取得に失敗しました (${res.status})`);
    }
    return res.json();
}
