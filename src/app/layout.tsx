import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "音声カルテ - BYOK",
    description: "音声入力で簡単にSOAPカルテを作成",
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
            <body>{children}</body>
        </html>
    );
}
