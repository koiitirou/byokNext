import { Settings, getCustomPrompts } from "./storage";
import soapPromptText from "@/prompts/soap_karte.txt";

const DEFAULT_PROMPT = `あなたは経験豊富な臨床医です。以下の音声は開業医の診察録音です。録音内容をSOAP形式のカルテに要約してください。`;

export function getDefaultPromptText(): string {
    if (typeof soapPromptText === "string" && soapPromptText.trim()) {
        return soapPromptText.trim();
    }
    return DEFAULT_PROMPT;
}

function getPrompt(settings: Settings): string {
    const { selectedPromptId } = settings;
    if (!selectedPromptId || selectedPromptId === "default") {
        return getDefaultPromptText();
    }
    const custom = getCustomPrompts().find((p) => p.id === selectedPromptId);
    if (custom) {
        return custom.text;
    }
    return getDefaultPromptText();
}

export async function transcribeAndSummarize(
    audioBase64: string,
    mimeType: string,
    settings: Settings,
    accessToken: string,
    projectId: string
): Promise<string> {
    const { region, model } = settings;
    const modelId = model || "gemini-2.5-flash";

    // Vertex AI REST endpoint
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${modelId}:generateContent`;

    const prompt = getPrompt(settings);

    const body = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType || "audio/webm",
                            data: audioBase64,
                        },
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
        },
    };

    const res = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vertex AI エラー (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "カルテの生成に失敗しました。";
    return text;
}
