export type SubscriptionPlanId = "go" | "plus" | "pro";

export interface TransferSubmittedRequest {
    plan: SubscriptionPlanId;
}

export interface SepayQrResponse {
    qrImageUrl: string;
    amountVnd: number;
    amountFormatted: string;
    bankDisplayName: string;
    accountNumber: string;
    transferContent: string;
    planId: SubscriptionPlanId;
    planLabel: string;
}
