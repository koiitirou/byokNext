/**
 * API Route: /api/prompts/text
 * GET — load full text of a specific prompt
 */
import { NextRequest, NextResponse } from "next/server";
import { gcsDownload } from "@/lib/gcsServer";

const PREFIX = "prompts";

export async function GET(req: NextRequest) {
    const authorId = req.nextUrl.searchParams.get("authorId");
    const fileName = req.nextUrl.searchParams.get("fileName");

    if (!authorId || !fileName) {
        return NextResponse.json({ error: "authorId and fileName are required" }, { status: 400 });
    }

    try {
        const objectName = `${PREFIX}/${authorId}/${fileName}`;
        const text = await gcsDownload(objectName);
        return NextResponse.json({ text });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to load prompt" },
            { status: 500 }
        );
    }
}
