"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    getSettings,
    saveSettings,
    Settings,
    getCustomPrompts,
    saveCustomPrompt,
    deleteCustomPrompt,
    CustomPrompt,
} from "@/lib/storage";
import {
    pickKeyFile,
    saveKeyFileHandle,
    loadKeyFileHandle,
    clearKeyFileHandle,
    readKeyFile,
} from "@/lib/auth";
import { getDefaultPromptText } from "@/lib/vertexai";
import styles from "./page.module.css";

const REGIONS = [
    { value: "asia-northeast1", label: "東京 (asia-northeast1)" },
    { value: "us-central1", label: "アイオワ (us-central1)" },
];

const MODELS = [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash（高速）" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro（高精度）" },
];

export default function SettingsPage() {
    const [form, setForm] = useState<Settings>({
        region: "asia-northeast1",
        model: "gemini-2.5-flash",
        selectedPromptId: "default",
    });
    const [saved, setSaved] = useState(false);
    const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
    const [newPromptName, setNewPromptName] = useState("");
    const [newPromptText, setNewPromptText] = useState("");
    const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
    const [keyFileName, setKeyFileName] = useState<string>("");
    const [keyStatus, setKeyStatus] = useState<string>("");

    useEffect(() => {
        setForm(getSettings());
        setPrompts(getCustomPrompts());

        // Load saved key file handle
        loadKeyFileHandle().then(async (handle) => {
            if (handle) {
                setKeyFileName(handle.name);
                try {
                    const key = await readKeyFile(handle);
                    setKeyStatus(`✓ ${key.project_id}`);
                } catch {
                    setKeyStatus("⚠ ファイルを再選択してください");
                }
            }
        });
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setSaved(false);
    };

    const handleSave = () => {
        saveSettings(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePickKey = async () => {
        const handle = await pickKeyFile();
        if (handle) {
            try {
                const key = await readKeyFile(handle);
                await saveKeyFileHandle(handle);
                setKeyFileName(handle.name);
                setKeyStatus(`✓ ${key.project_id}`);
            } catch (err) {
                setKeyStatus(err instanceof Error ? err.message : "エラー");
            }
        }
    };

    const handleClearKey = async () => {
        await clearKeyFileHandle();
        setKeyFileName("");
        setKeyStatus("");
    };

    const handleAddPrompt = () => {
        if (!newPromptName.trim() || !newPromptText.trim()) return;
        const p = saveCustomPrompt(newPromptName.trim(), newPromptText.trim());
        setPrompts(getCustomPrompts());
        setNewPromptName("");
        setNewPromptText("");
        // Auto-select the new prompt
        setForm((prev) => ({ ...prev, selectedPromptId: p.id }));
    };

    const handleDeletePrompt = (id: string) => {
        deleteCustomPrompt(id);
        setPrompts(getCustomPrompts());
        if (form.selectedPromptId === id) {
            setForm((prev) => ({ ...prev, selectedPromptId: "default" }));
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    ← 戻る
                </Link>
                <h1 className={styles.pageTitle}>⚙️ 設定</h1>
            </header>

            <div className={styles.form}>
                <h2 className={styles.sectionTitle}>Vertex AI 接続設定</h2>

                {/* Key file picker */}
                <div className={styles.field}>
                    <label className={styles.label}>
                        サービスアカウントキー
                        <span className={styles.labelHint}> — key.json ファイルを選択</span>
                    </label>
                    <div className={styles.keyFileRow}>
                        <button className={styles.keyFileBtn} onClick={handlePickKey}>
                            🔑 key.json を選択
                        </button>
                        {keyFileName && (
                            <>
                                <span className={styles.keyFileName}>{keyFileName}</span>
                                <button className={styles.keyFileClear} onClick={handleClearKey}>
                                    ✕
                                </button>
                            </>
                        )}
                    </div>
                    {keyStatus && (
                        <p className={styles.keyStatus}>{keyStatus}</p>
                    )}
                </div>

                {/* Region */}
                <div className={styles.field}>
                    <label className={styles.label}>リージョン</label>
                    <select
                        className={styles.select}
                        name="region"
                        value={form.region}
                        onChange={handleChange}
                    >
                        {REGIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Model */}
                <div className={styles.field}>
                    <label className={styles.label}>AI モデル</label>
                    <select
                        className={styles.select}
                        name="model"
                        value={form.model}
                        onChange={handleChange}
                    >
                        {MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.actions}>
                    <button className={styles.saveBtn} onClick={handleSave}>
                        保存
                    </button>
                </div>

                {saved && <p className={styles.saved}>✓ 設定を保存しました</p>}

                <hr className={styles.divider} />

                <h2 className={styles.sectionTitle}>カルテ生成プロンプト</h2>

                {/* Standard prompt reference */}
                <div className={styles.field}>
                    <button
                        className={styles.toggleBtn}
                        onClick={() => setShowDefaultPrompt(!showDefaultPrompt)}
                    >
                        📄 標準 SOAP プロンプトを{showDefaultPrompt ? "閉じる" : "表示"}
                    </button>
                    {showDefaultPrompt && (
                        <pre className={styles.promptPreview}>
                            {getDefaultPromptText()}
                        </pre>
                    )}
                </div>

                {/* Saved custom prompts */}
                {prompts.length > 0 && (
                    <div className={styles.promptList}>
                        <label className={styles.label}>保存済みプロンプト</label>
                        {prompts.map((p) => (
                            <div key={p.id} className={styles.promptItem}>
                                <span className={styles.promptName}>{p.name}</span>
                                <button
                                    className={styles.promptDeleteBtn}
                                    onClick={() => handleDeletePrompt(p.id)}
                                >
                                    削除
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add new custom prompt */}
                <div className={styles.field}>
                    <label className={styles.label}>
                        新しいカスタムプロンプトを追加
                    </label>
                    <input
                        className={styles.input}
                        type="text"
                        value={newPromptName}
                        onChange={(e) => setNewPromptName(e.target.value)}
                        placeholder="プロンプト名（例: 内科用、整形用）"
                    />
                    <textarea
                        className={styles.textarea}
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        placeholder="プロンプト内容を入力…"
                    />
                    <button
                        className={styles.addPromptBtn}
                        onClick={handleAddPrompt}
                        disabled={!newPromptName.trim() || !newPromptText.trim()}
                    >
                        + プロンプトを保存
                    </button>
                </div>
            </div>
        </div>
    );
}
