import type { VieGptPlanId } from "../hooks/useStore.ts";

/** Khớp với dropdown chế độ chat trong HomeView */
export type ChatModeId = "gpt54" | "instant" | "thinking" | "pro";

/**
 * Gộp xuống dòng đơn (Enter gửi / IME / lưu DB) → khoảng trắng; giữ `\n\n` cho đoạn văn (Shift+Enter).
 * Dùng khi **gửi** và khi **hiển thị** tin user để `pre-wrap` không tách một từ xuống dòng vì `\n` thừa.
 */
export function normalizeChatLineBreaks(raw: string): string {
    return raw
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u2028/g, "\n")
        .replace(/\u2029/g, "\n\n")
        .replace(/([^\n])\n(?!\n)/g, "$1 ")
        .replace(/[ \t\f\v]+/g, " ")
        .trim();
}

/**
 * Gói VieAI → model OpenAI (backend whitelist).
 * - PRO → gpt-5, PLUS → gpt-4o (dòng GPT-4), GO → gpt-4o-mini.
 * Nếu OpenAI báo lỗi verify với gpt-5: đặt `VITE_CHAT_MODEL_PRO=gpt-4o` (hoặc gpt-5-mini) trong `.env` / build Docker.
 * Override: `VITE_CHAT_MODEL_PRO`, `VITE_CHAT_MODEL_PLUS`, `VITE_CHAT_MODEL_GO`.
 */
export function planToOpenAIModel(plan: VieGptPlanId): string {
    const pro = import.meta.env.VITE_CHAT_MODEL_PRO ?? "gpt-5";
    const plus = import.meta.env.VITE_CHAT_MODEL_PLUS ?? "gpt-4o";
    const go = import.meta.env.VITE_CHAT_MODEL_GO ?? "gpt-4o-mini";
    switch (plan) {
        case "pro":
            return pro;
        case "plus":
            return plus;
        case "go":
            return go;
    }
}

/**
 * Chế độ UI → reasoning_effort (chỉ áp dụng gpt-5* trên backend; gpt-4 bỏ qua).
 */
export function modeToReasoningEffort(
    plan: VieGptPlanId,
    mode: ChatModeId
): "none" | "low" | "medium" | "high" | undefined {
    if (plan === "go") return undefined;
    switch (mode) {
        case "instant":
            return "low";
        case "thinking":
            return "high";
        case "gpt54":
            return "medium";
        case "pro":
            return "high";
    }
}
