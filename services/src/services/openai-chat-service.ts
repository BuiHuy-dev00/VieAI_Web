import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from 'openai/resources/chat/completions';
import type { ReasoningEffort } from 'openai/resources/shared';
import { createError } from '../middleware/error-handler';

const DEFAULT_MODEL = 'gpt-4o-mini';

/** Model do client gửi — chỉ chấp nhận các id cố định (tránh injection). */
const ALLOWED_REQUEST_MODELS = new Set([
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
]);

export function resolveChatModel(requested?: string | null): string {
    const r = typeof requested === 'string' ? requested.trim() : '';
    if (r && ALLOWED_REQUEST_MODELS.has(r)) {
        return r;
    }
    return getChatModel();
}

export function parseReasoningEffort(raw: unknown): ReasoningEffort | undefined {
    if (raw == null || raw === '') return undefined;
    const s = String(raw);
    const allowed: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    return (allowed as string[]).includes(s) ? (s as ReasoningEffort) : undefined;
}

/** Chỉ gửi reasoning_effort lên API cho dòng gpt-5 (gpt-4 không hỗ trợ). */
export function reasoningEffortForApi(model: string, effort: ReasoningEffort | undefined): ReasoningEffort | undefined {
    if (effort == null) return undefined;
    if (!model.startsWith('gpt-5')) return undefined;
    return effort;
}

export type UserImagePart = {
    mimeType: string;
    /** Base64 without data URL prefix */
    data: string;
};

export type HistoryRow = {
    role: string;
    content: string;
    attachments?: unknown;
};

function getOpenAI(): OpenAI {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
        throw createError(
            'OPENAI_API_KEY chưa có trong môi trường process. ' +
                'Docker: thêm OPENAI_API_KEY vào file .env cạnh docker-compose.yml hoặc services/.env rồi docker compose up -d --force-recreate backend. ' +
                'Chạy local: đặt trong services/.env hoặc .env ở thư mục gốc repo.',
            503
        );
    }
    return new OpenAI({ apiKey: key });
}

export function getChatModel(): string {
    return process.env.OPENAI_CHAT_MODEL?.trim() || DEFAULT_MODEL;
}

function parseAttachments(raw: unknown): UserImagePart[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((x) => {
                if (x && typeof x === 'object' && 'mimeType' in x && 'data' in x) {
                    return {
                        mimeType: String((x as { mimeType: string }).mimeType),
                        data: String((x as { data: string }).data),
                    };
                }
                return null;
            })
            .filter((x): x is UserImagePart => x != null && x.data.length > 0);
    }
    return [];
}

function userContentFromTextAndImages(text: string, images: UserImagePart[]): ChatCompletionContentPart[] {
    const parts: ChatCompletionContentPart[] = [];
    const t = text.trim();
    if (t.length > 0) {
        parts.push({ type: 'text', text });
    }
    for (const img of images) {
        const mime = img.mimeType || 'image/jpeg';
        parts.push({
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${img.data}` },
        });
    }
    if (parts.length === 0) {
        parts.push({ type: 'text', text: '(Không có nội dung)' });
    }
    return parts;
}

/**
 * Chuyển lịch sử DB + tin nhắn hiện tại sang định dạng OpenAI Chat Completions.
 */
export function buildOpenAIMessages(
    historyRows: HistoryRow[],
    currentText: string,
    currentImages: UserImagePart[]
): ChatCompletionMessageParam[] {
    const system: ChatCompletionMessageParam = {
        role: 'system',
        content:
            'Bạn là trợ lý VieAI, thân thiện và chính xác. Trả lời bằng tiếng Việt khi người dùng dùng tiếng Việt. ' +
            'Khi có ảnh đính kèm, hãy mô tả và trả lời theo nội dung ảnh.',
    };

    const out: ChatCompletionMessageParam[] = [system];

    for (const row of historyRows) {
        const role = row.role === 'assistant' ? 'assistant' : 'user';
        if (role === 'assistant') {
            out.push({ role: 'assistant', content: row.content ?? '' });
            continue;
        }
        const imgs = parseAttachments(row.attachments);
        if (imgs.length > 0) {
            const content = userContentFromTextAndImages(row.content ?? '', imgs);
            out.push({ role: 'user', content });
        } else {
            out.push({ role: 'user', content: row.content ?? '' });
        }
    }

    const currentContent =
        currentImages.length > 0
            ? userContentFromTextAndImages(currentText, currentImages)
            : currentText.trim() || '(Không có nội dung)';

    out.push({ role: 'user', content: currentContent });

    return out;
}

export type OpenAIChatCallOptions = {
    model: string;
    reasoningEffort?: ReasoningEffort;
};

/**
 * Một số model (GPT-5 / Responses) stream `delta.content` là mảng `{ type: 'text', text }` thay vì string.
 */
function textFromMessageContent(content: unknown): string {
    if (content == null) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        let s = '';
        for (const part of content) {
            if (part && typeof part === 'object' && 'text' in part) {
                const t = (part as { text?: unknown }).text;
                if (typeof t === 'string') s += t;
            }
        }
        return s;
    }
    return '';
}

export async function* streamOpenAIChat(
    messages: ChatCompletionMessageParam[],
    options?: OpenAIChatCallOptions
): AsyncGenerator<{
    text: string;
    done: boolean;
    /** Tổng token (prompt + completion) cho request này — OpenAI gửi ở chunk cuối khi bật include_usage */
    totalTokens?: number;
}> {
    const client = getOpenAI();
    const model = options?.model ?? getChatModel();
    const reasoning_effort = reasoningEffortForApi(model, options?.reasoningEffort);

    const stream = await client.chat.completions.create({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        ...(reasoning_effort != null ? { reasoning_effort } : {}),
    });

    let lastTotalTokens: number | undefined;

    for await (const chunk of stream) {
        const usage = (chunk as { usage?: { total_tokens?: number } }).usage;
        if (usage?.total_tokens != null) {
            lastTotalTokens = usage.total_tokens;
        }
        const choice = chunk.choices[0];
        if (!choice) continue;
        const piece = textFromMessageContent(choice.delta?.content);
        if (piece) {
            yield { text: piece, done: false };
        }
    }
    yield { text: '', done: true, totalTokens: lastTotalTokens };
}

export async function completeOpenAIChat(
    messages: ChatCompletionMessageParam[],
    options?: OpenAIChatCallOptions
): Promise<{
    text: string;
    totalTokens?: number;
}> {
    const client = getOpenAI();
    const model = options?.model ?? getChatModel();
    const reasoning_effort = reasoningEffortForApi(model, options?.reasoningEffort);
    const res = await client.chat.completions.create({
        model,
        messages,
        ...(reasoning_effort != null ? { reasoning_effort } : {}),
    });
    const text = textFromMessageContent(res.choices[0]?.message?.content);
    const totalTokens = res.usage?.total_tokens;
    return { text, totalTokens };
}
