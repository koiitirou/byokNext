"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
    AudioRecorder,
    pickDirectory,
    saveAudioToDirectory,
    generateFilename,
    saveDirHandle,
    loadDirHandle,
} from "@/lib/recorder";
import { transcribeAndSummarize } from "@/lib/vertexai";
import { loadKeyFileHandle, readKeyFile, getAccessToken } from "@/lib/auth";
import { getSettings, saveSettings, addHistory, getCustomPrompts, CustomPrompt } from "@/lib/storage";
import styles from "./page.module.css";

type Stage = "idle" | "recording" | "processing" | "done" | "error";

export default function Home() {
    const [stage, setStage] = useState<Stage>("idle");
    const [elapsed, setElapsed] = useState(0);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [folderName, setFolderName] = useState<string>("");
    const [selectedPromptId, setSelectedPromptId] = useState<string>("default");
    const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
    const recorderRef = useRef<AudioRecorder | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

    // Load saved directory handle and settings on mount
    useEffect(() => {
        loadDirHandle().then((handle) => {
            if (handle) {
                dirHandleRef.current = handle;
                setFolderName(handle.name);
            }
        });
        const settings = getSettings();
        setSelectedPromptId(settings.selectedPromptId || "default");
        setPrompts(getCustomPrompts());
    }, []);

    const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedPromptId(id);
        const settings = getSettings();
        saveSettings({ ...settings, selectedPromptId: id });
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60)
            .toString()
            .padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const startTimer = () => {
        setElapsed(0);
        timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    };

    const handleRecord = useCallback(async () => {
        if (stage === "recording") {
            // Stop recording
            stopTimer();
            setStage("processing");
            try {
                const recorder = recorderRef.current!;
                const { blob, base64 } = await recorder.stop();

                // Save audio to PC if directory is set
                if (dirHandleRef.current) {
                    try {
                        const perm = await (dirHandleRef.current as any).requestPermission({ mode: "readwrite" });
                        if (perm === "granted") {
                            const filename = generateFilename();
                            await saveAudioToDirectory(dirHandleRef.current, blob, filename);
                        }
                    } catch {
                        console.warn("録音ファイルの保存に失敗しました");
                    }
                }

                // Send to Vertex AI
                const settings = getSettings();
                const mimeType = blob.type || "audio/webm";

                // Load key file and get access token
                const keyHandle = await loadKeyFileHandle();
                if (!keyHandle) {
                    throw new Error("key.json が設定されていません。設定ページでサービスアカウントキーを選択してください。");
                }
                const saKey = await readKeyFile(keyHandle);
                const accessToken = await getAccessToken(saKey);

                const summary = await transcribeAndSummarize(base64, mimeType, settings, accessToken, saKey.project_id);
                addHistory(summary);
                setResult(summary);
                setStage("done");
            } catch (err) {
                setError(err instanceof Error ? err.message : "エラーが発生しました");
                setStage("error");
            }
        } else {
            // Start recording
            setResult("");
            setError("");
            try {
                const recorder = new AudioRecorder();
                await recorder.start();
                recorderRef.current = recorder;
                setStage("recording");
                startTimer();
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "マイクへのアクセスに失敗しました"
                );
                setStage("error");
            }
        }
    }, [stage]);

    const handlePickFolder = async () => {
        const handle = await pickDirectory();
        if (handle) {
            dirHandleRef.current = handle;
            setFolderName(handle.name);
            await saveDirHandle(handle);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        シャベカル
                        <span className={styles.titleSub}>BYOK Voice Karte</span>
                    </h1>
                </div>
                <div className={styles.headerRight}>
                    <Link href="/history" className={styles.iconBtn} title="履歴">
                        📋
                    </Link>
                    <Link href="/manual" className={styles.iconBtn} title="マニュアル">
                        📖
                    </Link>
                    <Link href="/settings" className={styles.iconBtn} title="設定">
                        ⚙️
                    </Link>
                </div>
            </header>

            {/* Center */}
            <div className={styles.centerArea}>
                {/* Prompt selector */}
                {prompts.length > 0 && (
                    <div className={styles.promptSelector}>
                        <label className={styles.promptLabel}>プロンプト:</label>
                        <select
                            className={styles.promptSelect}
                            value={selectedPromptId}
                            onChange={handlePromptChange}
                        >
                            <option value="default">標準 SOAP</option>
                            {prompts.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Folder selector */}
                <button className={styles.folderBar} onClick={handlePickFolder}>
                    <span className={styles.folderIcon}>📁</span>
                    {folderName
                        ? `保存先: ${folderName}`
                        : "録音の保存先フォルダを選択"}
                </button>

                {/* Timer */}
                {stage === "recording" && (
                    <div className={styles.timer}>{formatTime(elapsed)}</div>
                )}

                {/* Record button */}
                <button
                    className={`${styles.recordBtn} ${stage === "recording" ? styles.recording : ""
                        }`}
                    onClick={handleRecord}
                    disabled={stage === "processing"}
                    title={stage === "recording" ? "録音停止" : "録音開始"}
                >
                    {stage === "recording" ? "⏹" : "🎙"}
                </button>

                {/* Status */}
                <p className={styles.statusText}>
                    {stage === "idle" && "タップして録音開始"}
                    {stage === "recording" && "録音中… もう一度タップで停止"}
                    {stage === "processing" && ""}
                    {stage === "done" && "完了 — タップで新しい録音"}
                    {stage === "error" && ""}
                </p>

                {/* Processing */}
                {stage === "processing" && (
                    <div className={styles.processing}>
                        <div className={styles.spinner}></div>
                        <p className={styles.processingText}>
                            AI がカルテを作成しています…
                        </p>
                    </div>
                )}

                {/* Error */}
                {stage === "error" && (
                    <div className={styles.error}>{error}</div>
                )}

                {/* Result */}
                {stage === "done" && result && (
                    <div className={styles.resultCard}>
                        <div className={styles.resultHeader}>
                            <span className={styles.resultTitle}>SOAP カルテ</span>
                            <span className={styles.resultTime}>
                                {new Date().toLocaleString("ja-JP")}
                            </span>
                        </div>
                        <div className={styles.resultBody}>{result}</div>
                    </div>
                )}
            </div>


        </div>
    );
}
