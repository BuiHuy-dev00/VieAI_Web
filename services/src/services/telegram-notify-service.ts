import { createError } from '../middleware/error-handler';

/** Cấu hình bot Telegram (thông báo đã chuyển khoản). */
const TELEGRAM_BOT_TOKEN = '8743799621:AAHeRx-DgbxITDp5mCmW6ZhCRFn4cybd2Bo';
const TELEGRAM_CHAT_ID = '-5150236163';

const SEP = '━━━━━━━━━━━━━━━━━━━━';

function escapeTelegramHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Tin HTML gửi admin khi user xác nhận đã chuyển khoản.
 * Email trong &lt;code&gt; — trên Telegram chạm giữ để copy.
 */
export function buildTransferSubmittedNotificationHtml(params: {
    email: string;
    planLabel: string;
    amountWithCurrency: string;
}): string {
    const e = escapeTelegramHtml;
    const email = e(params.email);
    const plan = e(params.planLabel);
    const amount = e(params.amountWithCurrency);

    return [
        '🎯 <b>THÔNG BÁO THANH TOÁN</b>',
        '<i>VieAI · Xác nhận chuyển khoản từ khách hàng</i>',
        '',
        SEP,
        '',
        '📧 <b>Email đăng nhập</b>',
        `<code>${email}</code>`,
        '',
        '📦 <b>Gói đã chọn</b>',
        `├ ${plan}`,
        '',
        '💰 <b>Giá tiền</b>',
        `├ <b>${amount}</b>`,
        '',
        '✅ <b>Trạng thái</b>',
        '└ 🟢 <i>Đã chuyển khoản</i>',
        '',
        SEP,
        '',
        '<i>💡 Chạm vào ô email phía trên để sao chép nhanh.</i>',
    ].join('\n');
}

/**
 * Gửi tin nhắn tới group/channel Telegram qua Bot API.
 */
export async function sendTelegramMessage(text: string, options?: { parseMode?: 'HTML' }): Promise<void> {
    const url = `https://api.telegram.org/bot${encodeURIComponent(TELEGRAM_BOT_TOKEN)}/sendMessage`;
    const body: Record<string, unknown> = {
        chat_id: TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
    };
    if (options?.parseMode) {
        body.parse_mode = options.parseMode;
    }
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !json?.ok) {
        const msg = json?.description ?? res.statusText;
        throw createError(`Telegram: ${msg}`, 502);
    }
}

export async function sendTransferSubmittedNotification(params: {
    email: string;
    planLabel: string;
    amountFormatted: string;
}): Promise<void> {
    const html = buildTransferSubmittedNotificationHtml({
        email: params.email,
        planLabel: params.planLabel,
        amountWithCurrency: `${params.amountFormatted} VND`,
    });
    await sendTelegramMessage(html, { parseMode: 'HTML' });
}
