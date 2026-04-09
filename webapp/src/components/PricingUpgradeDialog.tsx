// src/components/PricingUpgradeDialog.tsx
import * as React from "react";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import AnalyticsOutlined from "@mui/icons-material/AnalyticsOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import ChatBubbleOutline from "@mui/icons-material/ChatBubbleOutline";
import Close from "@mui/icons-material/Close";
import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import LayersOutlined from "@mui/icons-material/LayersOutlined";
import PsychologyOutlined from "@mui/icons-material/PsychologyOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import SecurityOutlined from "@mui/icons-material/SecurityOutlined";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
import StarOutline from "@mui/icons-material/StarOutline";
import SummarizeOutlined from "@mui/icons-material/SummarizeOutlined";
import SupportAgentOutlined from "@mui/icons-material/SupportAgentOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import WorkspacePremiumOutlined from "@mui/icons-material/WorkspacePremiumOutlined";
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    IconButton,
    Link,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

const FONT = '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif';
const BORDER = "rgba(15, 23, 42, 0.12)";
const TEXT = "#0F172A";
const MUTED = "rgba(15, 23, 42, 0.58)";
const PURPLE = "#7C3AED";
const PURPLE_DARK = "#6D28D9";
const PLUS_SURFACE = "rgba(124, 58, 237, 0.07)";
const PAGE_BG = "#FAFAFB";

type BillingScope = "personal" | "enterprise";

export type PlanVariant = "go" | "plus" | "pro";

type FeatureLine = { text: string; Icon: SvgIconComponent };

type PlanDef = {
    id: string;
    shortName: string;
    priceAmount: string;
    subtitle: string;
    variant: PlanVariant;
    features: FeatureLine[];
    footnote?: React.ReactNode;
};

const PLANS: PlanDef[] = [
    {
        id: "go",
        shortName: "Go",
        priceAmount: "99.000",
        subtitle: "Tiếp tục trò chuyện với quyền truy cập mở rộng",
        variant: "go",
        features: [
            { text: "Khám phá chủ đề sâu hơn, hội thoại dài hơn", Icon: StarOutline },
            { text: "Truy cập mô hình và công cụ nâng cao", Icon: ChatBubbleOutline },
            { text: "Tóm tắt & phân tích văn bản chất lượng cao", Icon: SummarizeOutlined },
            { text: "Tải lên và xử lý tài liệu cơ bản", Icon: ImageOutlined },
            { text: "Ưu tiên phản hồi ổn định trên hàng đợi", Icon: SpeedOutlined },
            { text: "Tùy chỉnh phong cách trả lời phù hợp bạn", Icon: TuneOutlined },
        ],
        footnote: (
            <Typography sx={{ fontSize: 12, color: MUTED, fontFamily: FONT, lineHeight: 1.45, mt: "auto", pt: 2 }}>
                Gói này có thể chứa quảng cáo.{" "}
                <Link href="#" underline="hover" onClick={(e) => e.preventDefault()} sx={{ color: MUTED, fontWeight: 600 }}>
                    Tìm hiểu thêm
                </Link>
            </Typography>
        ),
    },
    {
        id: "plus",
        shortName: "Plus",
        priceAmount: "150.000",
        subtitle: "Tận hưởng trải nghiệm đầy đủ",
        variant: "plus",
        features: [
            { text: "Mọi tính năng Go với giới hạn sử dụng cao hơn", Icon: WorkspacePremiumOutlined },
            { text: "Ngữ cảnh hội thoại dài, nhớ tốt hơn giữa các phiên", Icon: PsychologyOutlined },
            { text: "Phân tích & tóm tắt đa dạng định dạng", Icon: LayersOutlined },
            { text: "Nhiều kiểu trả lời: ngắn gọn, chi tiết, có cấu trúc", Icon: AutoAwesomeOutlined },
            { text: "Ưu tiên hàng đợi và tốc độ phản hồi", Icon: SpeedOutlined },
            { text: "Hỗ trợ đa ngôn ngữ, điều chỉnh giọng điệu linh hoạt", Icon: LanguageOutlined },
            { text: "Tích hợp tra cứu và trích dẫn nguồn khi cần", Icon: SearchOutlined },
            { text: "Không gian làm việc cá nhân được mở rộng", Icon: AccountTreeOutlined },
        ],
    },
    {
        id: "pro",
        shortName: "Pro",
        priceAmount: "350.000",
        subtitle: "Tối đa hóa năng suất của bạn",
        variant: "pro",
        features: [
            { text: "Toàn bộ tính năng Plus với hạn mức cao nhất", Icon: StarOutline },
            { text: "Phân tích tài liệu dài, nhiều file trong một luồng", Icon: SummarizeOutlined },
            { text: "Quản lý dự án và không gian làm việc nâng cao", Icon: GroupsOutlined },
            { text: "Bảo mật, phân quyền và nhật ký sử dụng chi tiết", Icon: SecurityOutlined },
            { text: "Ưu tiên hỗ trợ kỹ thuật và xử lý sự cố", Icon: SupportAgentOutlined },
            { text: "Tùy chỉnh quy trình theo nhóm hoặc phòng ban", Icon: AccountTreeOutlined },
            { text: "Báo cáo sử dụng và hiệu quả cho quản trị", Icon: AnalyticsOutlined },
            { text: "SLA và tùy chọn triển khai theo tổ chức", Icon: GavelOutlined },
            { text: "Đồng bộ và mở rộng theo nhu cầu doanh nghiệp", Icon: CloudSyncOutlined },
        ],
        footnote: (
            <Stack spacing={0.75} sx={{ mt: "auto", pt: 2 }}>
                <Typography sx={{ fontSize: 12, color: MUTED, fontFamily: FONT, lineHeight: 1.45 }}>
                    Không giới hạn tùy thuộc vào các quy định bảo vệ tránh lạm dụng.{" "}
                    <Link href="#" underline="hover" onClick={(e) => e.preventDefault()} sx={{ color: MUTED, fontWeight: 600 }}>
                        Tìm hiểu thêm
                    </Link>
                </Typography>
                <Link
                    href="#"
                    underline="hover"
                    onClick={(e) => e.preventDefault()}
                    sx={{ fontSize: 12, color: MUTED, fontFamily: FONT, fontWeight: 600 }}
                >
                    Tôi cần trợ giúp về vấn đề thanh toán
                </Link>
            </Stack>
        ),
    },
];

function planTitle(short: string): string {
    return `VieGPT ${short}`;
}

function ctaLabel(v: PlanVariant): string {
    if (v === "go") return "Nâng cấp lên Go";
    if (v === "plus") return "Nâng cấp lên Plus";
    return "Nâng cấp lên Pro";
}

export type PricingUpgradeDialogProps = {
    open: boolean;
    onClose: () => void;
    /** Đi tới trang thanh toán SePay / VietQR */
    onStartPayment?: (planId: PlanVariant) => void;
};

export default function PricingUpgradeDialog({ open, onClose, onStartPayment }: PricingUpgradeDialogProps): React.JSX.Element {
    const [billingScope, setBillingScope] = React.useState<BillingScope>("personal");

    const handleBilling = (_: React.MouseEvent<HTMLElement>, value: BillingScope | null) => {
        if (value) setBillingScope(value);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            scroll="body"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 4,
                        border: `1px solid ${BORDER}`,
                        fontFamily: FONT,
                        maxWidth: 1180,
                        m: { xs: 1.5, sm: 2 },
                        bgcolor: PAGE_BG,
                        overflow: "hidden",
                    },
                },
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    px: { xs: 2, sm: 4 },
                    pt: 3.5,
                    pb: 2,
                    textAlign: "center",
                    bgcolor: PAGE_BG,
                }}
            >
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        right: 12,
                        top: 12,
                        color: MUTED,
                    }}
                >
                    <Close />
                </IconButton>
                <Typography
                    component="h2"
                    sx={{
                        fontFamily: FONT,
                        fontWeight: 800,
                        fontSize: { xs: 24, sm: 28 },
                        letterSpacing: "-0.03em",
                        color: TEXT,
                    }}
                >
                    Nâng cấp gói của bạn
                </Typography>

                <Stack direction="row" justifyContent="center" sx={{ mt: 2.5 }}>
                    <ToggleButtonGroup
                        value={billingScope}
                        exclusive
                        onChange={handleBilling}
                        aria-label="Loại gói"
                        sx={{
                            p: 0.5,
                            bgcolor: "rgba(15, 23, 42, 0.07)",
                            borderRadius: 999,
                            border: "none",
                            gap: 0.5,
                            "& .MuiToggleButtonGroup-grouped": {
                                border: 0,
                                borderRadius: "999px !important",
                                mx: 0,
                                px: 3,
                                py: 1,
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: 14,
                                fontFamily: FONT,
                                color: MUTED,
                            },
                            "& .Mui-selected": {
                                bgcolor: "#fff !important",
                                boxShadow: "0 1px 6px rgba(15, 23, 42, 0.12)",
                                color: `${TEXT} !important`,
                            },
                        }}
                    >
                        <ToggleButton value="personal">Cá nhân</ToggleButton>
                        <ToggleButton value="enterprise">Doanh nghiệp</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
                {billingScope === "enterprise" && (
                    <Typography sx={{ mt: 1.5, fontSize: 13, color: MUTED, fontFamily: FONT, maxWidth: 520, mx: "auto" }}>
                        Gói doanh nghiệp: báo giá và hạn mức theo hợp đồng — liên hệ bộ phận kinh doanh.
                    </Typography>
                )}
            </Box>

            <DialogContent
                sx={{
                    px: { xs: 2, sm: 3, md: 4 },
                    pb: 4,
                    pt: 0,
                    bgcolor: PAGE_BG,
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                            lg: "repeat(3, minmax(0, 1fr))",
                        },
                        gap: 2.5,
                        alignItems: "stretch",
                    }}
                >
                    {PLANS.map((plan) => {
                        const isPlus = plan.variant === "plus";

                        return (
                            <Box
                                key={plan.id}
                                sx={{
                                    position: "relative",
                                    borderRadius: 3,
                                    p: 3,
                                    border: isPlus ? `2px solid ${PURPLE}` : `1px solid ${BORDER}`,
                                    bgcolor: isPlus ? PLUS_SURFACE : "#fff",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    justifyContent: "flex-start",
                                    minHeight: "100%",
                                    boxShadow: isPlus ? "0 12px 36px rgba(124, 58, 237, 0.14)" : "0 2px 16px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                {isPlus && (
                                    <Typography
                                        sx={{
                                            position: "absolute",
                                            top: 14,
                                            right: 14,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            letterSpacing: "0.08em",
                                            color: "#fff",
                                            bgcolor: PURPLE,
                                            px: 1.35,
                                            py: 0.4,
                                            borderRadius: 999,
                                            fontFamily: FONT,
                                        }}
                                    >
                                        PHỔ BIẾN
                                    </Typography>
                                )}

                                <Box
                                    sx={{
                                        width: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        flex: "1 1 auto",
                                        minHeight: 0,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontFamily: FONT,
                                            fontWeight: 800,
                                            fontSize: { xs: 22, sm: 24 },
                                            letterSpacing: "-0.02em",
                                            color: TEXT,
                                            mb: 1.25,
                                            textAlign: "left",
                                            pr: isPlus ? 7 : 0,
                                        }}
                                    >
                                        {planTitle(plan.shortName)}
                                    </Typography>

                                    <Box sx={{ mb: 0, textAlign: "left" }}>
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontFamily: FONT,
                                                fontWeight: 800,
                                                fontSize: { xs: 28, sm: 32 },
                                                letterSpacing: "-0.03em",
                                                color: TEXT,
                                            }}
                                        >
                                            ₫ {plan.priceAmount}
                                        </Typography>
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontFamily: FONT,
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: MUTED,
                                                ml: 1,
                                            }}
                                        >
                                            VND / tháng (đã gồm VAT)
                                        </Typography>
                                    </Box>

                                    <Stack spacing={3} sx={{ width: 1, mt: 1.5, alignItems: "stretch" }}>
                                        <Box
                                            sx={{
                                                width: 1,
                                                minHeight: { xs: 72, sm: 56 },
                                                display: "flex",
                                                alignItems: "flex-start",
                                                justifyContent: "flex-start",
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontFamily: FONT,
                                                    fontSize: 14,
                                                    color: MUTED,
                                                    lineHeight: 1.5,
                                                    textAlign: "left",
                                                    width: 1,
                                                }}
                                            >
                                                {plan.subtitle}
                                            </Typography>
                                        </Box>

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            disableElevation
                                            onClick={() => {
                                                onStartPayment?.(plan.variant);
                                                onClose();
                                            }}
                                            sx={{
                                                flexShrink: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                boxSizing: "border-box",
                                                height: 48,
                                                minHeight: 48,
                                                maxHeight: 48,
                                                py: 0,
                                                px: 2.5,
                                                textTransform: "none",
                                                fontWeight: 700,
                                                fontFamily: FONT,
                                                fontSize: 15,
                                                lineHeight: "normal",
                                                borderRadius: 999,
                                                bgcolor: isPlus ? PURPLE : "#111827",
                                                color: "#fff",
                                                "&:hover": {
                                                    bgcolor: isPlus ? PURPLE_DARK : "#000",
                                                },
                                                "& .MuiButton-label": {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "100%",
                                                    lineHeight: "normal",
                                                },
                                            }}
                                        >
                                            {ctaLabel(plan.variant)}
                                        </Button>

                                        <Stack
                                            component="ul"
                                            spacing={1.35}
                                            sx={{
                                                pl: 0,
                                                listStyle: "none",
                                                m: 0,
                                                flex: "1 1 auto",
                                                minHeight: 0,
                                                alignSelf: "stretch",
                                            }}
                                        >
                                    {plan.features.map(({ text, Icon }) => (
                                        <Stack
                                            component="li"
                                            key={text}
                                            direction="row"
                                            spacing={1.25}
                                            alignItems="flex-start"
                                            sx={{ m: 0 }}
                                        >
                                            <Icon
                                                sx={{
                                                    fontSize: 20,
                                                    color: isPlus ? PURPLE : "rgba(15, 23, 42, 0.5)",
                                                    mt: 0.15,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Typography
                                                sx={{
                                                    fontFamily: FONT,
                                                    fontSize: 13,
                                                    lineHeight: 1.5,
                                                    color: "rgba(15, 23, 42, 0.88)",
                                                }}
                                            >
                                                {text}
                                            </Typography>
                                        </Stack>
                                    ))}
                                        </Stack>
                                    </Stack>
                                </Box>

                                {plan.footnote}
                            </Box>
                        );
                    })}
                </Box>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                    sx={{ mt: 3.5 }}
                >
                    <Link
                        href="#"
                        underline="hover"
                        onClick={(e) => e.preventDefault()}
                        sx={{ fontSize: 13, color: MUTED, fontFamily: FONT, fontWeight: 600 }}
                    >
                        Xem trợ giúp thanh toán
                    </Link>
                    <Typography sx={{ fontSize: 13, color: BORDER, display: { xs: "none", sm: "block" } }}>|</Typography>
                    <Link
                        href="#"
                        underline="hover"
                        onClick={(e) => e.preventDefault()}
                        sx={{ fontSize: 13, color: MUTED, fontFamily: FONT, fontWeight: 600 }}
                    >
                        Tìm hiểu thêm về các gói
                    </Link>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
