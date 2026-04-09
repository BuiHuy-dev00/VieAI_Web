import type { SubscriptionPlanId } from '../types/payment-types';
import { createError } from '../middleware/error-handler';

const SEPAY_BANKS_URL = 'https://qr.sepay.vn/banks.json';

const PLAN_AMOUNTS: Record<SubscriptionPlanId, number> = {
    go: 99_000,
    plus: 150_000,
    pro: 350_000,
};

const PLAN_LABELS: Record<SubscriptionPlanId, string> = {
    go: 'VieGPT Go',
    plus: 'VieGPT Plus',
    pro: 'VieGPT Pro',
};

export type SepayBankRow = {
    name: string;
    code: string;
    bin: string;
    short_name: string;
    supported?: boolean;
};

/** Nội dung CK: phần trước @ của email (bỏ khoảng trắng, tối đa 50 ký tự — giới hạn thực tế VietQR/CK). */
export function transferContentFromEmail(email: string): string {
    const local = email.trim().split('@')[0] ?? '';
    const cleaned = local.replace(/\s/g, '').slice(0, 50);
    if (!cleaned) {
        throw createError('Email không hợp lệ để tạo nội dung chuyển khoản', 400);
    }
    return cleaned;
}

export function assertPlan(plan: string): SubscriptionPlanId {
    if (plan === 'go' || plan === 'plus' || plan === 'pro') return plan;
    throw createError('plan phải là go, plus hoặc pro', 400);
}

export function amountForPlan(plan: SubscriptionPlanId): number {
    return PLAN_AMOUNTS[plan];
}

export function labelForPlan(plan: SubscriptionPlanId): string {
    return PLAN_LABELS[plan];
}

/**
 * Ảnh QR VietQR qua SePay — tham số `bank` là short_name (vd: Vietcombank), theo tài liệu SePay.
 * @see https://developer.sepay.vn/en/sepay-webhooks/tao-qr-va-form-thanh-toan
 */
export function buildSepayQrImageUrl(params: {
    accountNumber: string;
    /** Giá trị `short_name` từ banks.json (vd: Vietcombank) */
    bankShortName: string;
    amountVnd: number;
    transferContent: string;
}): string {
    const q = new URLSearchParams();
    q.set('acc', params.accountNumber.replace(/\s/g, ''));
    q.set('bank', params.bankShortName.trim());
    q.set('amount', String(Math.max(0, Math.round(params.amountVnd))));
    q.set('des', params.transferContent);
    return `https://qr.sepay.vn/img?${q.toString()}`;
}

let banksCache: { list: SepayBankRow[]; fetchedAt: number } | null = null;
const BANKS_CACHE_MS = 60 * 60 * 1000;

async function fetchSepayBanksList(): Promise<SepayBankRow[]> {
    if (banksCache && Date.now() - banksCache.fetchedAt < BANKS_CACHE_MS) {
        return banksCache.list;
    }
    const res = await fetch(SEPAY_BANKS_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw createError('Không tải được danh sách ngân hàng từ SePay (qr.sepay.vn)', 503);
    }
    const json = (await res.json()) as { data?: SepayBankRow[] };
    const list = Array.isArray(json.data) ? json.data : [];
    if (list.length === 0) {
        throw createError('Danh sách ngân hàng SePay rỗng', 503);
    }
    banksCache = { list, fetchedAt: Date.now() };
    return list;
}

/** Tìm bank theo mã VCB, short_name, hoặc bin. */
export function findBankByUserInput(banks: SepayBankRow[], raw: string): SepayBankRow | undefined {
    const s = raw.trim();
    if (!s) return undefined;
    const upper = s.toUpperCase();
    const lower = s.toLowerCase();

    return banks.find((b) => {
        if (b.code && b.code.toUpperCase() === upper) return true;
        if (b.short_name && b.short_name.toLowerCase() === lower) return true;
        if (b.bin && b.bin === s) return true;
        if (b.name && b.name.toLowerCase() === lower) return true;
        return false;
    });
}

/**
 * Chỉ cần .env: SEPAY_QR_ACCOUNT_NUMBER + SEPAY_QR_BANK_CODE (vd: VCB).
 * Tên hiển thị và short_name cho QR lấy từ https://qr.sepay.vn/banks.json
 */
export async function resolveSepayBankConfig(): Promise<{
    accountNumber: string;
    bankShortName: string;
    bankDisplayName: string;
}> {
    const accountNumber = process.env.SEPAY_QR_ACCOUNT_NUMBER?.trim();
    const bankCodeInput = process.env.SEPAY_QR_BANK_CODE?.trim();

    if (!accountNumber || !bankCodeInput) {
        throw createError(
            'Chưa cấu hình thanh toán: cần SEPAY_QR_ACCOUNT_NUMBER và SEPAY_QR_BANK_CODE trong .env (vd: SEPAY_QR_BANK_CODE=VCB)',
            503
        );
    }

    const banks = await fetchSepayBanksList();
    const found = findBankByUserInput(banks, bankCodeInput);

    if (!found?.short_name) {
        throw createError(
            `Không tìm thấy ngân hàng "${bankCodeInput}" trong danh sách SePay. Dùng mã như VCB, MB, TCB… (xem qr.sepay.vn/banks.json).`,
            400
        );
    }

    const bankDisplayName = found.name?.trim() || found.short_name;

    return {
        accountNumber,
        bankShortName: found.short_name,
        bankDisplayName,
    };
}

export function formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
