import { Body, Controller, Get, Post, Query, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { SepayQrResponse, TransferSubmittedRequest } from '../types/payment-types';
import { createError } from '../middleware/error-handler';
import {
    amountForPlan,
    assertPlan,
    buildSepayQrImageUrl,
    formatVnd,
    labelForPlan,
    resolveSepayBankConfig,
    transferContentFromEmail,
} from '../services/sepay-qr-service';
import { sendTransferSubmittedNotification } from '../services/telegram-notify-service';

@Route('api/payments')
@Tags('Payments')
export class PaymentController extends Controller {
    /**
     * Tạo URL ảnh QR SePay (VietQR) + thông tin CK cho gói VieGPT.
     * Nội dung CK = phần local của email (trước @).
     */
    @Get('sepay-qr')
    @Security('jwt')
    public async sepayQr(
        @Request() request: ExpressRequest,
        @Query() plan: string
    ): Promise<SepayQrResponse> {
        const planId = assertPlan(plan);
        const email = request.user?.email;
        if (!email) {
            throw createError('Unauthorized', 401);
        }

        const transferContent = transferContentFromEmail(email);
        const amountVnd = amountForPlan(planId);
        const { accountNumber, bankShortName, bankDisplayName } = await resolveSepayBankConfig();

        const qrImageUrl = buildSepayQrImageUrl({
            accountNumber,
            bankShortName,
            amountVnd,
            transferContent,
        });

        return {
            qrImageUrl,
            amountVnd,
            amountFormatted: formatVnd(amountVnd),
            bankDisplayName,
            accountNumber,
            transferContent,
            planId,
            planLabel: labelForPlan(planId),
        };
    }

    /**
     * Người dùng xác nhận đã chuyển khoản — gửi thông báo tới admin qua Telegram.
     */
    @Post('transfer-submitted')
    @Security('jwt')
    public async transferSubmitted(
        @Request() request: ExpressRequest,
        @Body() body: TransferSubmittedRequest
    ): Promise<{ ok: true; message: string }> {
        const email = request.user?.email;
        if (!email) {
            throw createError('Unauthorized', 401);
        }

        const planId = assertPlan(body.plan);
        const planLabel = labelForPlan(planId);
        const amountVnd = amountForPlan(planId);
        const amountFormatted = formatVnd(amountVnd);

        await sendTransferSubmittedNotification({
            email,
            planLabel,
            amountFormatted,
        });

        return {
            ok: true,
            message: 'Đã gửi thông báo tới admin.',
        };
    }
}
