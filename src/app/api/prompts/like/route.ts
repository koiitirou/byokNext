/**
 * API Route: /api/prompts/like
 * POST — toggle like on a prompt
 * GET  — get like info for a prompt
 */
import { NextRequest, NextResponse } from "next/server";
import { gcsUpload, gcsList, gcsDelete } from "@/lib/gcsServer";

const PREFIX = "prompts";

function makeLikePrefix(authorId: string, fileName: string): string {
    const promptKey = `${authorId}_${fileName}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return `${PREFIX}/_likes/${promptKey}/`;
}

// GET /api/prompts/like?authorId=...&fileName=...&browserId=...
export async function GET(req: NextRequest) {
    const authorId = req.nextUrl.searchParams.get("authorId");
    const fileName = req.nextUrl.searchParams.get("fileName");
    const browserId = req.nextUrl.searchParams.get("browserId");

    if (!authorId || !fileName || !browserId) {
        return NextResponse.json({ error: "authorId, fileName, browserId are required" }, { status: 400 });
    }

    try {
        const likePrefix = makeLikePrefix(authorId, fileName);
        const items = await gcsList(likePrefix);
        const liked = items.some((item) => item.name.endsWith(`/${browserId}`));
        return NextResponse.json({ liked, count: items.length });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to get like info" },
            { status: 500 }
        );
    }
}

// POST /api/prompts/like  { authorId, fileName, browserId }
export async function POST(req: NextRequest) {
    try {
        const { authorId, fileName, browserId } = await req.json();
        if (!authorId || !fileName || !browserId) {
            return NextResponse.json({ error: "authorId, fileName, browserId are required" }, { status: 400 });
        }

        const likePrefix = makeLikePrefix(authorId, fileName);
        const likeObject = `${likePrefix}${browserId}`;
        const items = await gcsList(likePrefix);
        const myLike = items.find((item) => item.name === likeObject);

        if (myLike) {
            // Unlike
            await gcsDelete(likeObject);
            return NextResponse.json({ liked: false, count: items.length - 1 });
        } else {
            // Like
            await gcsUpload(likeObject, "1", "text/plain");
            return NextResponse.json({ liked: true, count: items.length + 1 });
        }
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to toggle like" },
            { status: 500 }
        );
    }
}
