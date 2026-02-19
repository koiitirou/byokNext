"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    getHistory,
    deleteHistory,
    clearHistory,
    KarteEntry,
} from "@/lib/storage";
import styles from "./page.module.css";

export default function HistoryPage() {
    const [entries, setEntries] = useState<KarteEntry[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        setEntries(getHistory());
    }, []);

    const handleDelete = (id: string) => {
        deleteHistory(id);
        setEntries(getHistory());
    };

    const handleClearAll = () => {
        if (confirm("すべての履歴を削除しますか？")) {
            clearHistory();
            setEntries([]);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    ← 戻る
                </Link>
                <h1 className={styles.pageTitle}>📋 カルテ履歴</h1>
                <div className={styles.headerSpacer} />
                {entries.length > 0 && (
                    <button className={styles.clearBtn} onClick={handleClearAll}>
                        全削除
                    </button>
                )}
            </header>

            {entries.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📝</span>
                    まだカルテ履歴がありません
                </div>
            ) : (
                <div className={styles.list}>
                    {entries.map((entry) => (
                        <div key={entry.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTime}>
                                    {formatDate(entry.timestamp)}
                                </span>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDelete(entry.id)}
                                >
                                    削除
                                </button>
                            </div>
                            <div
                                className={`${styles.cardBody} ${expandedId === entry.id ? styles.expanded : ""
                                    }`}
                            >
                                {entry.summary}
                            </div>
                            <button
                                className={styles.expandBtn}
                                onClick={() =>
                                    setExpandedId(expandedId === entry.id ? null : entry.id)
                                }
                            >
                                {expandedId === entry.id ? "閉じる" : "全文を表示"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
