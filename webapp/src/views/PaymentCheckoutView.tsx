// src/views/PaymentCheckoutView.tsx
import * as React from "react";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ContentCopy from "@mui/icons-material/ContentCopy";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import HelpOutline from "@mui/icons-material/HelpOutline";
import NumbersOutlined from "@mui/icons-material/NumbersOutlined";
import SecurityOutlined from "@mui/icons-material/SecurityOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../components/Auth/AuthContext.tsx";
import { useStore, type VieGptPlanId } from "../hooks/useStore.ts";

const PRIMARY = "#003461";
const PRIMARY_2 = "#004b87";
const BG = "#f8f9fa";
const ON_SURFACE = "#191c1d";
const MUTED = "#424750";
const OUTLINE = "#c2c6d1";

type SepayPayload = {
    qrImageUrl: string;
    amountVnd: number;
    amountFormatted: string;
    bankDisplayName: string;
    accountNumber: string;
    transferContent: string;
    planId: string;
    planLabel: string;
};

const PLANS = new Set(["go", "plus", "pro"]);

function copyText(text: string): void {
    void navigator.clipboard.writeText(text);
}

export default function PaymentCheckoutView(): React.JSX.Element {
    const [params] = useSearchParams();
    const plan = params.get("plan") ?? "";
    const navigate = useNavigate();
    const { authFetch } = useAuth();

    const [data, setData] = React.useState<SepayPayload | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [submittingTransfer, setSubmittingTransfer] = React.useState(false);
    const [transferSubmitError, setTransferSubmitError] = React.useState<string | null>(null);
    const [successDialogOpen, setSuccessDialogOpen] = React.useState(false);

    const API_BASE = import.meta.env.VITE_APP_API_URL as string;

    React.useEffect(() => {
        if (PLANS.has(plan)) {
            useStore.getState().setVieGptPlan(plan as VieGptPlanId);
        }
    }, [plan]);

    const handleTransferSubmitted = React.useCallback(async () => {
        if (!data) return;
        setTransferSubmitError(null);
        setSubmittingTransfer(true);
        try {
            const res = await authFetch(`${API_BASE}/api/payments/transfer-submitted`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: data.planId }),
            });
            const json = (await res.json().catch(() => null)) as
                | { ok?: boolean; message?: string }
                | { error?: { message?: string }; message?: string }
                | null;
            if (!res.ok) {
                const j = json as { error?: { message?: string }; message?: string } | null;
                setTransferSubmitError(j?.error?.message ?? j?.message ?? `Lỗi ${res.status}`);
                return;
            }
            setSuccessDialogOpen(true);
        } catch (e) {
            setTransferSubmitError(e instanceof Error ? e.message : "Không gửi được yêu cầu.");
        } finally {
            setSubmittingTransfer(false);
        }
    }, [API_BASE, authFetch, data]);

    React.useEffect(() => {
        if (!PLANS.has(plan)) {
            setError("Gói không hợp lệ.");
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await authFetch(`${API_BASE}/api/payments/sepay-qr?plan=${encodeURIComponent(plan)}`);
                const json = (await res.json().catch(() => null)) as
                    | SepayPayload
                    | { error?: { message?: string }; message?: string }
                    | null;
                if (cancelled) return;
                if (!res.ok) {
                    const j = json as { error?: { message?: string }; message?: string } | null;
                    setError(j?.error?.message ?? j?.message ?? `Lỗi ${res.status}`);
                    setData(null);
                    return;
                }
                setData(json as SepayPayload);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Không tải được thông tin thanh toán.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [plan, authFetch, API_BASE]);

    return (
        <>
            <CssBaseline />
            <Box
                sx={{
                    minHeight: "100vh",
                    bgcolor: BG,
                    color: ON_SURFACE,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    fontFamily: '"Inter", "Be Vietnam Pro", system-ui, sans-serif',
                }}
            >
                <Box
                    component="header"
                    sx={{
                        width: "100%",
                        bgcolor: "rgba(255,255,255,0.72)",
                        backdropFilter: "blur(12px)",
                        borderBottom: `1px solid ${OUTLINE}`,
                        position: "sticky",
                        top: 0,
                        zIndex: 50,
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ maxWidth: 900, mx: "auto", px: 3, py: 2 }}
                    >
                        <Typography sx={{ fontWeight: 800, fontSize: 20, color: PRIMARY, letterSpacing: "-0.02em" }}>
                            VIEAI
                        </Typography>
                        <IconButton size="small" aria-label="Trợ giúp" sx={{ color: MUTED }}>
                            <HelpOutline />
                        </IconButton>
                    </Stack>
                </Box>

                <Box component="main" sx={{ maxWidth: 900, width: "100%", px: 3, py: 6 }}>
                    <Stack spacing={5} alignItems="center">
                        <Stack spacing={1} alignItems="center" textAlign="center">
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    color: PRIMARY,
                                    letterSpacing: "-0.03em",
                                    fontSize: { xs: "1.65rem", md: "2.1rem" },
                                }}
                            >
                                Thanh toán đơn hàng
                            </Typography>
                            <Typography sx={{ color: MUTED, maxWidth: 520, fontSize: 15 }}>
                                Vui lòng quét mã QR hoặc chuyển khoản thủ công bằng thông tin bên dưới.
                            </Typography>
                        </Stack>

                        {loading && (
                            <Stack alignItems="center" py={6}>
                                <CircularProgress sx={{ color: PRIMARY }} />
                            </Stack>
                        )}

                        {error && !loading && (
                            <Alert severity="error" sx={{ width: "100%", maxWidth: 560 }}>
                                {error}
                            </Alert>
                        )}

                        {!loading && data && (
                            <>
                                <Typography sx={{ color: MUTED, fontSize: 14 }}>
                                    Gói: <strong style={{ color: ON_SURFACE }}>{data.planLabel}</strong>
                                </Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                        gap: 4,
                                        width: "100%",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            borderRadius: 3,
                                            bgcolor: "#e1e3e4",
                                            boxShadow: "0 24px 48px -12px rgba(25, 28, 29, 0.08)",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 3,
                                        }}
                                    >
                                        <Stack spacing={0.5} alignItems="center">
                                            <Typography sx={{ fontWeight: 800, fontSize: 18, color: PRIMARY }}>
                                                Quét mã để thanh toán
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: MUTED }}>
                                                Hỗ trợ ứng dụng ngân hàng qua VietQR (SePay)
                                            </Typography>
                                        </Stack>
                                        <Box
                                            sx={{
                                                bgcolor: "#fff",
                                                p: 2,
                                                borderRadius: 2,
                                                border: "1px solid #fff",
                                                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)",
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={data.qrImageUrl}
                                                alt="Mã QR thanh toán"
                                                sx={{ width: { xs: 200, sm: 224 }, height: { xs: 200, sm: 224 }, display: "block" }}
                                            />
                                        </Box>
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: PRIMARY, fontWeight: 700, fontSize: 12 }}>
                                            <BoltOutlined fontSize="small" />
                                            <span>Xác nhận tức thì</span>
                                        </Stack>
                                    </Paper>

                                    <Stack spacing={2.5} sx={{ width: "100%" }}>
                                        <FieldRow
                                            label="Tên ngân hàng"
                                            icon={<AccountBalanceOutlined sx={{ color: "#4a6078" }} />}
                                            value={data.bankDisplayName}
                                            copy={false}
                                        />
                                        <FieldRow
                                            label="Số tài khoản"
                                            icon={<NumbersOutlined sx={{ color: "#4a6078" }} />}
                                            value={data.accountNumber}
                                            copy
                                            onCopy={() => copyText(data.accountNumber)}
                                        />
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 2,
                                                background: "rgba(0, 52, 97, 0.05)",
                                                border: "1px solid rgba(0, 52, 97, 0.2)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 2,
                                            }}
                                        >
                                            <Box>
                                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.1em", mb: 0.5 }}>
                                                    SỐ TIỀN
                                                </Typography>
                                                <Typography sx={{ fontSize: 28, fontWeight: 800, color: PRIMARY, letterSpacing: "-0.02em" }}>
                                                    {data.amountFormatted}{" "}
                                                    <Box component="span" sx={{ fontSize: 14, fontWeight: 600 }}>
                                                        VND
                                                    </Box>
                                                </Typography>
                                            </Box>
                                            <Button
                                                size="small"
                                                onClick={() => copyText(String(data.amountVnd))}
                                                sx={{ color: PRIMARY, fontWeight: 700, fontSize: 11 }}
                                                startIcon={<ContentCopy sx={{ fontSize: 16 }} />}
                                            >
                                                Sao chép
                                            </Button>
                                        </Paper>
                                        <FieldRow
                                            label="Nội dung chuyển khoản"
                                            icon={<DescriptionOutlined sx={{ color: "#4a6078" }} />}
                                            value={data.transferContent}
                                            copy
                                            onCopy={() => copyText(data.transferContent)}
                                            small
                                        />
                                    </Stack>
                                </Box>

                                {transferSubmitError && (
                                    <Alert severity="warning" sx={{ width: "100%", maxWidth: 560 }} onClose={() => setTransferSubmitError(null)}>
                                        {transferSubmitError}
                                    </Alert>
                                )}

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 2, width: "100%", maxWidth: 560 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        disabled={submittingTransfer}
                                        onClick={() => void handleTransferSubmitted()}
                                        sx={{
                                            py: 2,
                                            borderRadius: 999,
                                            fontWeight: 800,
                                            textTransform: "none",
                                            fontSize: 16,
                                            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_2} 100%)`,
                                            boxShadow: "0 12px 28px rgba(0, 52, 97, 0.25)",
                                        }}
                                        startIcon={
                                            submittingTransfer ? (
                                                <CircularProgress size={22} color="inherit" />
                                            ) : (
                                                <CheckCircleOutline />
                                            )
                                        }
                                    >
                                        {submittingTransfer ? "Đang gửi…" : "Tôi đã chuyển khoản"}
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        size="large"
                                        onClick={() => navigate(-1)}
                                        sx={{
                                            py: 2,
                                            borderRadius: 999,
                                            fontWeight: 800,
                                            textTransform: "none",
                                            borderColor: "#727781",
                                            color: MUTED,
                                        }}
                                    >
                                        Hủy thanh toán
                                    </Button>
                                </Stack>

                                <Stack
                                    direction="row"
                                    flexWrap="wrap"
                                    justifyContent="center"
                                    gap={4}
                                    sx={{ pt: 4, borderTop: `1px solid ${OUTLINE}`, width: "100%" }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>
                                        <VerifiedUserOutlined sx={{ fontSize: 18 }} />
                                        Bảo mật kết nối TLS
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>
                                        <SecurityOutlined sx={{ fontSize: 18 }} />
                                        Giao dịch an toàn
                                    </Stack>
                                </Stack>
                            </>
                        )}
                    </Stack>
                </Box>
                <Box sx={{ height: 40 }} />
            </Box>

            <Dialog
                open={successDialogOpen}
                onClose={() => setSuccessDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: PRIMARY }}>Thông báo</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: ON_SURFACE, lineHeight: 1.65 }}>
                        Yêu cầu đã được gửi tới admin, đơn hàng sẽ được xét duyệt trong thời gian ngắn. Cảm ơn đã sử dụng dịch vụ của chúng tôi.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setSuccessDialogOpen(false);
                            navigate("/");
                        }}
                        sx={{
                            borderRadius: 999,
                            fontWeight: 800,
                            textTransform: "none",
                            px: 3,
                            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_2} 100%)`,
                        }}
                    >
                        Về trang chủ
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function FieldRow(props: {
    label: string;
    icon: React.ReactNode;
    value: string;
    copy: boolean;
    onCopy?: () => void;
    small?: boolean;
}): React.JSX.Element {
    const { label, icon, value, copy, onCopy, small } = props;
    return (
        <Stack spacing={0.75}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.12em" }}>{label}</Typography>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "#f3f4f5",
                    border: `1px solid ${OUTLINE}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                    {icon}
                    <Typography sx={{ fontWeight: 800, color: ON_SURFACE, fontSize: small ? 14 : 16, wordBreak: "break-all" }}>
                        {value}
                    </Typography>
                </Stack>
                {copy && onCopy && (
                    <Button
                        size="small"
                        onClick={onCopy}
                        sx={{ color: PRIMARY, fontWeight: 800, fontSize: 10, flexShrink: 0 }}
                        startIcon={<ContentCopy sx={{ fontSize: 16 }} />}
                    >
                        SAO CHÉP
                    </Button>
                )}
            </Paper>
        </Stack>
    );
}
