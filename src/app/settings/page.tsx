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
import { getDefaultPromptText } from "@/lib/vertexai";
import styles from "./page.module.css";

const REGIONS = [
    { value: "asia-northeast1", label: "東京 (asia-northeast1)" },
    { value: "asia-northeast2", label: "大阪 (asia-northeast2)" },
];

export default function SettingsPage() {
    const [form, setForm] = useState<Settings>({
        apiKey: "",
        projectId: "",
        region: "asia-northeast1",
        selectedPromptId: "default",
    });
    const [saved, setSaved] = useState(false);
    const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
    const [newPromptName, setNewPromptName] = useState("");
    const [newPromptText, setNewPromptText] = useState("");
    const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

    useEffect(() => {
        setForm(getSettings());
        setPrompts(getCustomPrompts());
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

                <div className={styles.field}>
                    <label className={styles.label}>
                        API Key / Access Token
                        <span className={styles.labelHint}> — Vertex AI の認証トークン</span>
                    </label>
                    <input
                        className={styles.input}
                        type="password"
                        name="apiKey"
                        value={form.apiKey}
                        onChange={handleChange}
                        placeholder="AIza... / ya29...."
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>
                        Project ID
                        <span className={styles.labelHint}> — GCP プロジェクト ID</span>
                    </label>
                    <input
                        className={styles.input}
                        type="text"
                        name="projectId"
                        value={form.projectId}
                        onChange={handleChange}
                        placeholder="my-clinic-project"
                    />
                </div>

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
