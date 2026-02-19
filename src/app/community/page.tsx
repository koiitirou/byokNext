"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    listCommunityPrompts,
    loadCloudPromptText,
    toggleLike,
    getLikeInfo,
    CloudPrompt,
} from "@/lib/gcs";
import { saveCustomPrompt } from "@/lib/storage";
import { getBrowserId } from "@/lib/browserId";
import styles from "./page.module.css";

interface PromptWithMeta extends CloudPrompt {
    likeCount: number;
    liked: boolean;
    expanded: boolean;
    fullText: string;
}

export default function CommunityPage() {
    const [prompts, setPrompts] = useState<PromptWithMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const myBrowserId = typeof window !== "undefined" ? getBrowserId() : "";

    const loadPrompts = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { prompts: cloudPrompts } = await listCommunityPrompts();
            const withMeta: PromptWithMeta[] = cloudPrompts.map((p) => ({
                ...p,
                likeCount: 0,
                liked: false,
                expanded: false,
                fullText: "",
            }));
            setPrompts(withMeta);

            // Load like info in background
            for (let i = 0; i < withMeta.length; i++) {
                try {
                    const info = await getLikeInfo(withMeta[i].authorId, withMeta[i].fileName);
                    setPrompts((prev) =>
                        prev.map((p, j) =>
                            j === i ? { ...p, likeCount: info.count, liked: info.liked } : p
                        )
                    );
                } catch {
                    // Skip
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPrompts();
    }, [loadPrompts]);

    const handleExpand = async (index: number) => {
        const p = prompts[index];
        if (p.expanded) {
            setPrompts((prev) =>
                prev.map((item, i) => (i === index ? { ...item, expanded: false } : item))
            );
            return;
        }
        try {
            const text = p.fullText || (await loadCloudPromptText(p.authorId, p.fileName));
            setPrompts((prev) =>
                prev.map((item, i) =>
                    i === index ? { ...item, expanded: true, fullText: text } : item
                )
            );
        } catch {
            // ignore
        }
    };

    const handleLike = async (index: number) => {
        const p = prompts[index];
        try {
            const result = await toggleLike(p.authorId, p.fileName);
            setPrompts((prev) =>
                prev.map((item, i) =>
                    i === index ? { ...item, liked: result.liked, likeCount: result.count } : item
                )
            );
        } catch {
            // ignore
        }
    };

    const handleCopyToLocal = async (index: number) => {
        const p = prompts[index];
        try {
            const text = p.fullText || (await loadCloudPromptText(p.authorId, p.fileName));
            saveCustomPrompt(p.name, text);
            setCopied(p.fileName);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    ← 戻る
                </Link>
                <h1 className={styles.pageTitle}>🌐 コミュニティ</h1>
            </header>

            <p className={styles.subtitle}>
                みんなが共有したプロンプトを閲覧・活用できます
            </p>

            {loading && (
                <div className={styles.loadingArea}>
                    <div className={styles.spinner}></div>
                    <p>読み込み中…</p>
                </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            {!loading && prompts.length === 0 && !error && (
                <div className={styles.empty}>
                    まだ共有プロンプトがありません。設定ページからプロンプトを共有しましょう！
                </div>
            )}

            <div className={styles.promptList}>
                {prompts.map((p, i) => (
                    <div key={`${p.authorId}-${p.fileName}`} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle} onClick={() => handleExpand(i)}>
                                <span className={styles.promptName}>{p.name}</span>
                                <span className={styles.expandIcon}>
                                    {p.expanded ? "▲" : "▼"}
                                </span>
                            </div>
                            <div className={styles.cardMeta}>
                                <span className={styles.author}>
                                    {p.authorId === myBrowserId ? "👤 自分" : `👤 ${p.authorAlias}`}
                                </span>
                                <span className={styles.date}>
                                    {new Date(p.createdAt).toLocaleDateString("ja-JP")}
                                </span>
                            </div>
                        </div>

                        {p.expanded && p.fullText && (
                            <pre className={styles.promptPreview}>{p.fullText}</pre>
                        )}

                        <div className={styles.cardActions}>
                            <button
                                className={`${styles.likeBtn} ${p.liked ? styles.liked : ""}`}
                                onClick={() => handleLike(i)}
                            >
                                {p.liked ? "👍" : "👍"} {p.likeCount > 0 ? p.likeCount : ""}
                            </button>
                            <button
                                className={styles.copyBtn}
                                onClick={() => handleCopyToLocal(i)}
                            >
                                {copied === p.fileName ? "✓ 保存済" : "📥 マイプロンプトに追加"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
