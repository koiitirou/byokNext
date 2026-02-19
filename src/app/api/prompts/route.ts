/**
 * API Route: /api/prompts
 * GET  — list all community prompts
 * POST — save a prompt to cloud
 */
import { NextRequest, NextResponse } from "next/server";
import { gcsUpload, gcsDownload, gcsList } from "@/lib/gcsServer";

const PREFIX = "prompts";

interface PromptManifest {
    authorId: string;
    authorAlias: string;
    prompts: {
        name: string;
        fileName: string;
        createdAt: string;
    }[];
}

// GET /api/prompts — list all community prompts
export async function GET() {
    try {
        const allItems = await gcsList(`${PREFIX}/`);
        const manifestItems = allItems.filter((item) => item.name.endsWith("/manifest.json"));

        const prompts: {
            name: string;
            authorId: string;
            authorAlias: string;
            fileName: string;
            createdAt: string;
        }[] = [];

        for (const item of manifestItems) {
            try {
                const manifestJson = await gcsDownload(item.name);
                if (!manifestJson) continue;
                const manifest: PromptManifest = JSON.parse(manifestJson);

                for (const p of manifest.prompts) {
                    prompts.push({
                        name: p.name,
                        authorId: manifest.authorId,
                        authorAlias: manifest.authorAlias || "Anonymous",
                        fileName: p.fileName,
                        createdAt: p.createdAt,
                    });
                }
            } catch {
                // Skip broken manifests
            }
        }

        prompts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return NextResponse.json({ prompts });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to list prompts" },
            { status: 500 }
        );
    }
}

// POST /api/prompts — save a prompt
export async function POST(req: NextRequest) {
    try {
        const { name, text, browserId, authorAlias } = await req.json();
        if (!name || !text || !browserId) {
            return NextResponse.json({ error: "name, text, browserId are required" }, { status: 400 });
        }

        const fileName = `${name.replace(/[/\\?%*:|"<>]/g, "_")}.txt`;
        const objectName = `${PREFIX}/${browserId}/${fileName}`;

        // Upload prompt text
        await gcsUpload(objectName, text, "text/plain; charset=utf-8");

        // Update manifest
        const manifestPath = `${PREFIX}/${browserId}/manifest.json`;
        let manifest: PromptManifest;
        try {
            const existing = await gcsDownload(manifestPath);
            manifest = existing ? JSON.parse(existing) : {
                authorId: browserId,
                authorAlias: authorAlias || "Anonymous",
                prompts: [],
            };
        } catch {
            manifest = {
                authorId: browserId,
                authorAlias: authorAlias || "Anonymous",
                prompts: [],
            };
        }

        manifest.prompts = manifest.prompts.filter((p) => p.fileName !== fileName);
        manifest.prompts.push({ name, fileName, createdAt: new Date().toISOString() });
        if (authorAlias) manifest.authorAlias = authorAlias;

        await gcsUpload(manifestPath, JSON.stringify(manifest, null, 2));

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to save prompt" },
            { status: 500 }
        );
    }
}
