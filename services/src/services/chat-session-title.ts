/**
 * Tiêu đề hiển thị trong sidebar — từ tin nhắn user đầu tiên (giống ChatGPT).
 */
const DEFAULT_TITLES = new Set(['new chat', 'đoạn chat mới', '']);

export function isDefaultSessionTitle(title: string | null | undefined): boolean {
    return DEFAULT_TITLES.has((title ?? '').trim().toLowerCase());
}

export function deriveSessionTitle(firstUserText: string, hasImageAttachment: boolean): string {
    const raw = firstUserText.replace(/\s+/g, ' ').trim();
    if (raw.length > 0) {
        const line = raw.split('\n')[0].trim();
        const max = 60;
        if (line.length <= max) return line;
        return `${line.slice(0, max - 1)}…`;
    }
    if (hasImageAttachment) return 'Ảnh mới';
    return 'Đoạn chat mới';
}
