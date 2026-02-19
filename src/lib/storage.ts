/* ===== Settings ===== */
export interface Settings {
    apiKey: string;
    projectId: string;
    region: string;
    selectedPromptId: string; // "default" or custom prompt id
}

const SETTINGS_KEY = "byok-karte-settings";

const DEFAULT_SETTINGS: Settings = {
    apiKey: "",
    projectId: "",
    region: "asia-northeast1",
    selectedPromptId: "default",
};

export function getSettings(): Settings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(settings: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ===== Custom Prompts ===== */
export interface CustomPrompt {
    id: string;
    name: string;
    text: string;
}

const PROMPTS_KEY = "byok-karte-prompts";

export function getCustomPrompts(): CustomPrompt[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(PROMPTS_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export function saveCustomPrompt(name: string, text: string): CustomPrompt {
    const prompt: CustomPrompt = {
        id: crypto.randomUUID(),
        name,
        text,
    };
    const prompts = getCustomPrompts();
    prompts.push(prompt);
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
    return prompt;
}

export function deleteCustomPrompt(id: string): void {
    const prompts = getCustomPrompts().filter((p) => p.id !== id);
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

/* ===== History ===== */
export interface KarteEntry {
    id: string;
    timestamp: string;
    summary: string;
}

const HISTORY_KEY = "byok-karte-history";

export function getHistory(): KarteEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export function addHistory(summary: string): KarteEntry {
    const entry: KarteEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        summary,
    };
    const history = getHistory();
    history.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return entry;
}

export function deleteHistory(id: string): void {
    const history = getHistory().filter((e) => e.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
}
