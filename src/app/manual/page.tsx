"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function ManualPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    ← 戻る
                </Link>
                <h1 className={styles.pageTitle}>📖 マニュアル</h1>
            </header>

            <div className={styles.content}>
                <h2 className={styles.sectionTitle}>Vertex AI サービスアカウントキーの取得方法</h2>
                <p className={styles.intro}>
                    シャベカルを使用するには、Google Cloud の<strong>サービスアカウントキー（key.json）</strong>が必要です。
                    以下の手順で取得してください。
                </p>

                <div className={styles.steps}>
                    {/* Step 1 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>1</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>Google Cloud Console にアクセス</h3>
                            <p className={styles.stepText}>
                                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                                    console.cloud.google.com
                                </a>
                                {" "}にアクセスし、Google アカウントでログインします。
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>2</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>プロジェクトを作成（または選択）</h3>
                            <p className={styles.stepText}>
                                上部のプロジェクト選択メニューから、既存のプロジェクトを選ぶか、
                                <strong>「新しいプロジェクト」</strong>をクリックして作成します。
                            </p>
                            <div className={styles.tip}>
                                💡 プロジェクト名は自由（例: my-karte-project）
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>3</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>Vertex AI API を有効化</h3>
                            <p className={styles.stepText}>
                                左メニューの<strong>「API とサービス」→「ライブラリ」</strong>から、
                                <strong>「Vertex AI API」</strong>を検索して<strong>「有効にする」</strong>をクリックします。
                            </p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>4</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>課金を有効化</h3>
                            <p className={styles.stepText}>
                                Vertex AI は課金が必要です。左メニューの<strong>「お支払い」</strong>から、
                                請求先アカウントをプロジェクトにリンクします。
                            </p>
                            <div className={styles.tip}>
                                💡 新規アカウントには $300 の無料トライアルクレジットがあります
                            </div>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>5</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>サービスアカウントを作成</h3>
                            <ol className={styles.subSteps}>
                                <li>左メニューの<strong>「IAM と管理」→「サービスアカウント」</strong>を開く</li>
                                <li>上部の<strong>「+ サービスアカウントを作成」</strong>をクリック</li>
                                <li>名前を入力（例: karte-ai）→<strong>「作成して続行」</strong></li>
                                <li>ロールに<strong>「Vertex AI ユーザー」</strong>を選択 →<strong>「完了」</strong></li>
                            </ol>
                        </div>
                    </div>

                    {/* Step 6 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>6</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>キーファイル（key.json）をダウンロード</h3>
                            <ol className={styles.subSteps}>
                                <li>作成したサービスアカウントをクリック</li>
                                <li><strong>「キー」</strong>タブを開く</li>
                                <li><strong>「鍵を追加」→「新しい鍵を作成」</strong>をクリック</li>
                                <li>キーのタイプに<strong>「JSON」</strong>を選択 →<strong>「作成」</strong></li>
                                <li>key.json ファイルが自動ダウンロードされます</li>
                            </ol>
                            <div className={styles.warning}>
                                ⚠️ このファイルは再ダウンロードできません。USB メモリなど安全な場所に保管してください。
                            </div>
                        </div>
                    </div>

                    {/* Step 7 */}
                    <div className={styles.step}>
                        <div className={styles.stepNum}>7</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>シャベカルで key.json を設定</h3>
                            <ol className={styles.subSteps}>
                                <li>シャベカルの<strong>⚙️ 設定</strong>ページを開く</li>
                                <li><strong>「🔑 key.json を選択」</strong>ボタンからファイルを指定</li>
                                <li>プロジェクト ID が自動表示されれば成功</li>
                                <li>リージョンと AI モデルを選んで<strong>「保存」</strong></li>
                            </ol>
                            <div className={styles.tip}>
                                💡 USB に key.json を入れておけば、どの PC でも使えます
                            </div>
                        </div>
                    </div>
                </div>

                <hr className={styles.divider} />

                <h2 className={styles.sectionTitle}>使い方</h2>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <div className={styles.stepNum}>1</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>録音する</h3>
                            <p className={styles.stepText}>
                                トップページの🎙ボタンをタップして診察を録音します。もう一度タップで停止。
                            </p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNum}>2</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>カルテが自動生成</h3>
                            <p className={styles.stepText}>
                                録音停止後、AI が自動で SOAP 形式のカルテを生成します。
                            </p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNum}>3</div>
                        <div className={styles.stepBody}>
                            <h3 className={styles.stepTitle}>履歴を確認</h3>
                            <p className={styles.stepText}>
                                生成したカルテは📋履歴から確認・コピーできます。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
