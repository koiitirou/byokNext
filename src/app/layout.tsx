import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-R4GYHJL5H0";

export const metadata: Metadata = {
    title: "シャベカル — 音声カルテ自動生成",
    description: "診察をしゃべるだけでSOAPカルテを自動生成。現役医師が開発、BYOK方式で3省2ガイドライン準拠。",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                {children}
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                    strategy="afterInteractive"
                />
                <Script id="ga4-init" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_ID}');
                    `}
                </Script>
            </body>
        </html>
    );
}
