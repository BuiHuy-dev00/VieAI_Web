import * as React from "react";
import Add from "@mui/icons-material/Add";
import ArrowBack from "@mui/icons-material/ArrowBack";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import LockOpenOutlined from "@mui/icons-material/LockOpenOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import {
    AppBar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Toolbar,
    Typography,
    MenuItem,
    Divider,
    Stack,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAuth } from "../components/Auth/AuthContext.tsx";
import ChatMarkdown from "../components/chat/ChatMarkdown.tsx";

const API_BASE = import.meta.env.VITE_APP_API_URL as string;

type AdminUserRow = {
    id: number;
    email: string;
    name: string | null;
    created_at: string;
    is_admin: boolean;
    account_locked: boolean;
    monthly_token_limit: number | null;
};

type ItemRow = {
    id: string;
    name: string;
    expiry_date?: string;
    status: string;
    icon_url: string;
};

type AdminDetail = AdminUserRow & {
    items: ItemRow[];
    tokens_used_total: number;
    tokens_used_this_month: number;
};

type TokenDay = { day: string; tokens: number };

type ChatSess = { id: string; title: string; updated_at: string };

type MsgRow = {
    id: number;
    role: "user" | "assistant";
    content: string;
    created_at: string;
};

type CatalogEntry = { id: string; name: string; description?: string };

export default function AdminUsersView(): React.JSX.Element {
    const navigate = useNavigate();
    const { authFetch, user: currentUser } = useAuth();
    const qc = useQueryClient();

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(15);
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

    const [extendOpen, setExtendOpen] = React.useState(false);
    const [extendItemId, setExtendItemId] = React.useState<string | null>(null);
    const [extendDays, setExtendDays] = React.useState("30");

    const [editOpen, setEditOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<ItemRow | null>(null);
    const [editName, setEditName] = React.useState("");
    const [editStatus, setEditStatus] = React.useState("active");
    const [editExpiry, setEditExpiry] = React.useState("");

    const [limitOpen, setLimitOpen] = React.useState(false);
    const [limitInput, setLimitInput] = React.useState("");

    const [sessionForMessages, setSessionForMessages] = React.useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = React.useState<ItemRow | null>(null);
    const [addOpen, setAddOpen] = React.useState(false);
    const [addTemplateId, setAddTemplateId] = React.useState("");
    const [addExpiryDays, setAddExpiryDays] = React.useState("30");

    const [createUserOpen, setCreateUserOpen] = React.useState(false);
    const [newEmail, setNewEmail] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [newName, setNewName] = React.useState("");
    const [newTemplateId, setNewTemplateId] = React.useState("viegpt_go");
    const [newExpiryDays, setNewExpiryDays] = React.useState("30");

    const [deleteAccountTarget, setDeleteAccountTarget] = React.useState<AdminUserRow | null>(null);

    const listQuery = useQuery({
        queryKey: ["admin", "users", page, rowsPerPage],
        queryFn: async () => {
            const p = page + 1;
            const res = await authFetch(
                `${API_BASE}/api/admin/users?page=${p}&limit=${rowsPerPage}`
            );
            if (!res.ok) {
                const j = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(j?.message ?? `Lỗi ${res.status}`);
            }
            return res.json() as Promise<{
                users: AdminUserRow[];
                total: number;
            }>;
        },
    });

    const detailQuery = useQuery({
        queryKey: ["admin", "user", selectedId],
        queryFn: async () => {
            const res = await authFetch(`${API_BASE}/api/admin/users/${selectedId}`);
            if (!res.ok) throw new Error("Không tải được chi tiết");
            return res.json() as Promise<AdminDetail>;
        },
        enabled: selectedId != null,
    });

    const usageQuery = useQuery({
        queryKey: ["admin", "usage", selectedId],
        queryFn: async () => {
            const res = await authFetch(
                `${API_BASE}/api/admin/users/${selectedId}/token-usage?days=30`
            );
            if (!res.ok) throw new Error("Không tải biểu đồ token");
            return res.json() as Promise<{ days: TokenDay[]; total_in_range: number }>;
        },
        enabled: selectedId != null,
    });

    const sessionsQuery = useQuery({
        queryKey: ["admin", "sessions", selectedId],
        queryFn: async () => {
            const res = await authFetch(`${API_BASE}/api/admin/users/${selectedId}/sessions`);
            if (!res.ok) throw new Error("Không tải danh sách chat");
            return res.json() as Promise<ChatSess[]>;
        },
        enabled: selectedId != null,
    });

    const messagesQuery = useQuery({
        queryKey: ["admin", "messages", selectedId, sessionForMessages],
        queryFn: async () => {
            const res = await authFetch(
                `${API_BASE}/api/admin/users/${selectedId}/sessions/${sessionForMessages}/messages`
            );
            if (!res.ok) throw new Error("Không tải tin nhắn");
            return res.json() as Promise<{ messages: MsgRow[] }>;
        },
        enabled: selectedId != null && sessionForMessages != null,
    });

    const catalogQuery = useQuery({
        queryKey: ["admin", "item-catalog"],
        queryFn: async () => {
            const res = await authFetch(`${API_BASE}/api/admin/item-catalog`);
            if (!res.ok) throw new Error("Không tải danh mục dịch vụ");
            return res.json() as Promise<CatalogEntry[]>;
        },
        staleTime: 5 * 60 * 1000,
    });

    const invalidateUserList = () => {
        void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    };

    const openCreateUserDialog = () => {
        setNewEmail("");
        setNewPassword("");
        setNewName("");
        setNewTemplateId(catalogQuery.data?.[0]?.id ?? "");
        setNewExpiryDays("30");
        setCreateUserOpen(true);
    };

    const handleCreateUser = async () => {
        const email = newEmail.trim();
        if (!email || !newPassword) {
            alert("Nhập email và mật khẩu.");
            return;
        }
        const days = parseInt(newExpiryDays, 10);
        const res = await authFetch(`${API_BASE}/api/admin/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password: newPassword,
                name: newName.trim() || undefined,
                ...(newTemplateId ? { templateId: newTemplateId } : {}),
                ...(newTemplateId
                    ? { expiryDays: Number.isFinite(days) && days > 0 ? days : 30 }
                    : {}),
            }),
        });
        if (!res.ok) {
            const j = (await res.json().catch(() => null)) as {
                error?: { message?: string };
                message?: string;
            } | null;
            alert(j?.error?.message ?? j?.message ?? "Không tạo được tài khoản.");
            return;
        }
        setCreateUserOpen(false);
        invalidateUserList();
    };

    const handleConfirmDeleteAccount = async () => {
        if (!deleteAccountTarget) return;
        const deletedId = deleteAccountTarget.id;
        const res = await authFetch(`${API_BASE}/api/admin/users/${deletedId}`, {
            method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
            const j = (await res.json().catch(() => null)) as {
                error?: { message?: string };
                message?: string;
            } | null;
            alert(j?.error?.message ?? j?.message ?? "Không xóa được tài khoản.");
            return;
        }
        setDeleteAccountTarget(null);
        if (selectedId === deletedId) {
            setSelectedId(null);
        }
        invalidateUserList();
    };

    const invalidateDetail = () => {
        void qc.invalidateQueries({ queryKey: ["admin", "user", selectedId] });
        void qc.invalidateQueries({ queryKey: ["admin", "usage", selectedId] });
    };

    const handleToggleLock = async () => {
        if (selectedId == null || !detailQuery.data) return;
        const locked = !detailQuery.data.account_locked;
        const res = await authFetch(`${API_BASE}/api/admin/users/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_locked: locked }),
        });
        if (!res.ok) {
            const j = (await res.json().catch(() => null)) as { message?: string } | null;
            alert(j?.message ?? "Thất bại");
            return;
        }
        void listQuery.refetch();
        invalidateDetail();
    };

    const handleSaveLimit = async () => {
        if (selectedId == null) return;
        const raw = limitInput.trim();
        const body =
            raw === "" ? { monthly_token_limit: null } : { monthly_token_limit: parseInt(raw, 10) };
        if (raw !== "" && Number.isNaN(body.monthly_token_limit as number)) {
            alert("Nhập số hợp lệ hoặc để trống (không giới hạn)");
            return;
        }
        const res = await authFetch(`${API_BASE}/api/admin/users/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            alert("Không lưu được");
            return;
        }
        setLimitOpen(false);
        invalidateDetail();
    };

    const handleExtend = async () => {
        if (selectedId == null || !extendItemId) return;
        const d = parseInt(extendDays, 10);
        if (d < 1 || d > 3650) {
            alert("Số ngày 1–3650");
            return;
        }
        const res = await authFetch(
            `${API_BASE}/api/admin/users/${selectedId}/items/${extendItemId}/extend-days`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ days: d }),
            }
        );
        if (!res.ok) {
            alert("Không gia hạn được");
            return;
        }
        setExtendOpen(false);
        invalidateDetail();
    };

    const openEdit = (it: ItemRow) => {
        setEditItem(it);
        setEditName(it.name);
        setEditStatus(it.status);
        setEditExpiry(it.expiry_date ? it.expiry_date.slice(0, 16) : "");
        setEditOpen(true);
    };

    const openAddServiceDialog = () => {
        if (catalogQuery.isLoading || !catalogQuery.data) {
            alert("Đang tải danh mục dịch vụ, thử lại sau vài giây.");
            return;
        }
        const cat = catalogQuery.data;
        const owned = new Set((detailQuery.data?.items ?? []).map((i) => i.name));
        const avail = cat.filter((c) => !owned.has(c.name));
        if (avail.length === 0) {
            alert("User đã có đủ các gói ChatGPT (GO / PLUS / PRO) trong danh mục.");
            return;
        }
        setAddTemplateId(avail[0]!.id);
        setAddExpiryDays("30");
        setAddOpen(true);
    };

    const handleAddService = async () => {
        if (selectedId == null || !addTemplateId) return;
        const days = parseInt(addExpiryDays, 10);
        const res = await authFetch(`${API_BASE}/api/admin/users/${selectedId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                templateId: addTemplateId,
                expiryDays: Number.isFinite(days) && days > 0 ? days : 30,
            }),
        });
        if (res.status === 409) {
            alert("Người dùng đã có dịch vụ này.");
            return;
        }
        if (!res.ok) {
            const j = (await res.json().catch(() => null)) as {
                error?: { message?: string };
                message?: string;
            } | null;
            alert(j?.error?.message ?? j?.message ?? "Không thêm được dịch vụ.");
            return;
        }
        setAddOpen(false);
        invalidateDetail();
    };

    const handleConfirmDeleteItem = async () => {
        if (selectedId == null || !deleteTarget) return;
        const res = await authFetch(
            `${API_BASE}/api/admin/users/${selectedId}/items/${deleteTarget.id}`,
            { method: "DELETE" }
        );
        if (!res.ok && res.status !== 204) {
            alert("Không xóa được dịch vụ.");
            return;
        }
        setDeleteTarget(null);
        invalidateDetail();
    };

    const handleSaveItem = async () => {
        if (selectedId == null || !editItem) return;
        const payload: Record<string, unknown> = {
            name: editName,
            status: editStatus,
        };
        if (editExpiry) {
            payload.expiry_date = new Date(editExpiry).toISOString();
        }
        const res = await authFetch(
            `${API_BASE}/api/admin/users/${selectedId}/items/${editItem.id}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );
        if (!res.ok) {
            alert("Không cập nhật được dịch vụ");
            return;
        }
        setEditOpen(false);
        invalidateDetail();
    };

    const chartData = (usageQuery.data?.days ?? []).map((x) => ({
        label: x.day.slice(5),
        tokens: x.tokens,
    }));

    const total = listQuery.data?.total ?? 0;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8" }}>
            <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #e0e4ea" }}>
                <Toolbar>
                    <IconButton edge="start" onClick={() => navigate("/")} aria-label="Về trang chủ">
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 800, ml: 1 }}>
                        Quản trị người dùng
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: 2, maxWidth: 1400, mx: "auto" }}>
                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => openCreateUserDialog()}
                        disabled={catalogQuery.isLoading}
                    >
                        Thêm tài khoản
                    </Button>
                </Stack>
                <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
                    {listQuery.isLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : listQuery.isError ? (
                        <Typography color="error" sx={{ p: 2 }}>
                            {(listQuery.error as Error).message}
                        </Typography>
                    ) : (
                        <>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "rgba(0,52,97,0.06)" }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Email</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Tên</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Đăng ký</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                Thao tác
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(listQuery.data?.users ?? []).map((u) => (
                                            <TableRow
                                                key={u.id}
                                                hover
                                                selected={selectedId === u.id}
                                                onClick={() => setSelectedId(u.id)}
                                                sx={{ cursor: "pointer" }}
                                            >
                                                <TableCell>{u.id}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>{u.name ?? "—"}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                        {u.is_admin && (
                                                            <Chip size="small" label="Admin" color="primary" />
                                                        )}
                                                        {u.account_locked && (
                                                            <Chip size="small" label="Khóa" color="error" />
                                                        )}
                                                        {!u.account_locked && (
                                                            <Chip size="small" label="Hoạt động" variant="outlined" />
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(u.created_at).toLocaleString("vi-VN")}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        aria-label="Xóa tài khoản"
                                                        disabled={
                                                            u.is_admin ||
                                                            Number(currentUser?.id) === u.id
                                                        }
                                                        onClick={() => setDeleteAccountTarget(u)}
                                                        title={
                                                            u.is_admin
                                                                ? "Không xóa tài khoản quản trị"
                                                                : Number(currentUser?.id) === u.id
                                                                  ? "Không xóa chính bạn"
                                                                  : "Xóa tài khoản"
                                                        }
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                component="div"
                                count={total}
                                page={page}
                                onPageChange={(_, p) => setPage(p)}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={(e) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                                labelRowsPerPage="Số dòng"
                                rowsPerPageOptions={[10, 15, 25, 50]}
                            />
                        </>
                    )}
                </Paper>
            </Box>

            <Dialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Thêm tài khoản</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Email"
                        type="email"
                        fullWidth
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        autoComplete="off"
                    />
                    <TextField
                        margin="dense"
                        label="Mật khẩu"
                        type="password"
                        fullWidth
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    <TextField
                        margin="dense"
                        label="Tên hiển thị"
                        fullWidth
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 0.5 }}>
                        Dịch vụ ban đầu (ChatGPT VieAI)
                    </Typography>
                    <TextField
                        select
                        margin="dense"
                        label="Gói dịch vụ"
                        fullWidth
                        value={newTemplateId}
                        onChange={(e) => setNewTemplateId(e.target.value)}
                        helperText="Có thể để trống nếu chỉ tạo tài khoản, chưa gán gói."
                    >
                        <MenuItem value="">— Chưa gán gói —</MenuItem>
                        {(catalogQuery.data ?? []).map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Hạn sau (ngày từ hôm nay)"
                        type="number"
                        fullWidth
                        value={newExpiryDays}
                        onChange={(e) => setNewExpiryDays(e.target.value)}
                        inputProps={{ min: 1, max: 3650 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateUserOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void handleCreateUser()}>
                        Tạo tài khoản
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteAccountTarget != null} onClose={() => setDeleteAccountTarget(null)}>
                <DialogTitle>Xóa tài khoản?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Xóa vĩnh viễn tài khoản{" "}
                        <Box component="span" sx={{ fontWeight: 700 }}>
                            {deleteAccountTarget?.email}
                        </Box>
                        ? Toàn bộ đoạn chat và dịch vụ liên quan sẽ bị xóa.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteAccountTarget(null)}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={() => void handleConfirmDeleteAccount()}>
                        Xóa tài khoản
                    </Button>
                </DialogActions>
            </Dialog>

            <Drawer
                anchor="right"
                open={selectedId != null}
                onClose={() => {
                    setSelectedId(null);
                    setSessionForMessages(null);
                }}
                PaperProps={{ sx: { width: { xs: "100%", sm: 560, md: 720 } } }}
            >
                <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
                    {detailQuery.isLoading && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {detailQuery.data && (
                        <>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                {detailQuery.data.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                ID {detailQuery.data.id}
                                {detailQuery.data.name ? ` · ${detailQuery.data.name}` : ""}
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                                <Button
                                    variant="outlined"
                                    color={detailQuery.data.account_locked ? "success" : "error"}
                                    size="small"
                                    startIcon={
                                        detailQuery.data.account_locked ? (
                                            <LockOpenOutlined />
                                        ) : (
                                            <LockOutlined />
                                        )
                                    }
                                    onClick={() => void handleToggleLock()}
                                >
                                    {detailQuery.data.account_locked ? "Mở khóa" : "Khóa tài khoản"}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        setLimitInput(
                                            detailQuery.data!.monthly_token_limit != null
                                                ? String(detailQuery.data!.monthly_token_limit)
                                                : ""
                                        );
                                        setLimitOpen(true);
                                    }}
                                >
                                    Giới hạn token/tháng
                                </Button>
                            </Stack>

                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                                gap={1}
                                sx={{ mt: 2 }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    Dịch vụ đang dùng
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => openAddServiceDialog()}
                                    disabled={catalogQuery.isLoading}
                                >
                                    Thêm dịch vụ
                                </Button>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Tổng token (ước lượng): {detailQuery.data.tokens_used_total.toLocaleString("vi-VN")}{" "}
                                · Tháng này: {detailQuery.data.tokens_used_this_month.toLocaleString("vi-VN")}
                                {detailQuery.data.monthly_token_limit != null
                                    ? ` / giới hạn ${detailQuery.data.monthly_token_limit.toLocaleString("vi-VN")}`
                                    : ""}
                            </Typography>

                            <TableContainer sx={{ mt: 1, border: "1px solid #e8eaed", borderRadius: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Dịch vụ</TableCell>
                                            <TableCell>Hạn</TableCell>
                                            <TableCell>Trạng thái</TableCell>
                                            <TableCell align="right">Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detailQuery.data.items.map((it) => (
                                            <TableRow key={it.id}>
                                                <TableCell>{it.name}</TableCell>
                                                <TableCell>
                                                    {it.expiry_date
                                                        ? new Date(it.expiry_date).toLocaleString("vi-VN")
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>{it.status}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Thêm ngày"
                                                        onClick={() => {
                                                            setExtendItemId(it.id);
                                                            setExtendDays("30");
                                                            setExtendOpen(true);
                                                        }}
                                                    >
                                                        <EventRepeatOutlined fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Sửa dịch vụ"
                                                        onClick={() => openEdit(it)}
                                                    >
                                                        <EditOutlined fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Xóa dịch vụ"
                                                        color="error"
                                                        onClick={() => setDeleteTarget(it)}
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 3, mb: 1 }}>
                                Mức dùng token (30 ngày)
                            </Typography>
                            <Box sx={{ width: "100%", height: 260 }}>
                                {usageQuery.isLoading ? (
                                    <CircularProgress size={28} />
                                ) : (
                                    <ResponsiveContainer>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" fontSize={11} />
                                            <YAxis fontSize={11} />
                                            <RechartsTooltip />
                                            <Line
                                                type="monotone"
                                                dataKey="tokens"
                                                stroke="#003461"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>

                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2, mb: 1 }}>
                                Đoạn chat
                            </Typography>
                            <Paper variant="outlined" sx={{ maxHeight: 200, overflow: "auto" }}>
                                <List dense disablePadding>
                                    {(sessionsQuery.data ?? []).map((s) => (
                                        <ListItemButton
                                            key={s.id}
                                            selected={sessionForMessages === s.id}
                                            onClick={() => setSessionForMessages(s.id)}
                                        >
                                            <ListItemText
                                                primary={s.title || "Không tiêu đề"}
                                                secondary={new Date(s.updated_at).toLocaleString("vi-VN")}
                                                primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
                                                secondaryTypographyProps={{ fontSize: 11 }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Paper>

                            {sessionForMessages && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                        Tin nhắn
                                    </Typography>
                                    {messagesQuery.isLoading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        <Stack spacing={1.5}>
                                            {(messagesQuery.data?.messages ?? []).map((m) => (
                                                <Paper
                                                    key={m.id}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor:
                                                            m.role === "user"
                                                                ? "rgba(0,52,97,0.04)"
                                                                : "rgba(16,163,127,0.06)",
                                                    }}
                                                >
                                                    <Typography variant="caption" color="text.secondary">
                                                        {m.role === "user" ? "Người dùng" : "Trợ lý"} ·{" "}
                                                        {new Date(m.created_at).toLocaleString("vi-VN")}
                                                    </Typography>
                                                    <Box sx={{ mt: 0.5, fontSize: 14 }}>
                                                        {m.role === "assistant" ? (
                                                            <ChatMarkdown content={m.content} />
                                                        ) : (
                                                            <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                                                {m.content}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </Box>
            </Drawer>

            <Dialog open={extendOpen} onClose={() => setExtendOpen(false)}>
                <DialogTitle>Gia hạn thêm ngày</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Số ngày"
                        type="number"
                        fullWidth
                        value={extendDays}
                        onChange={(e) => setExtendDays(e.target.value)}
                        inputProps={{ min: 1, max: 3650 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExtendOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void handleExtend()}>
                        Áp dụng
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Thay đổi dịch vụ</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Tên dịch vụ"
                        fullWidth
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                    />
                    <TextField
                        select
                        margin="dense"
                        label="Trạng thái"
                        fullWidth
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                    >
                        <MenuItem value="active">active</MenuItem>
                        <MenuItem value="expired">expired</MenuItem>
                        <MenuItem value="pending">pending</MenuItem>
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Hạn (địa phương)"
                        type="datetime-local"
                        fullWidth
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void handleSaveItem()}>
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteTarget != null} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Xóa dịch vụ?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Xóa{" "}
                        <Box component="span" sx={{ fontWeight: 700 }}>
                            {deleteTarget?.name ?? ""}
                        </Box>{" "}
                        khỏi tài khoản này? Hành động không hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={() => void handleConfirmDeleteItem()}>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Thêm dịch vụ</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Chọn gói ChatGPT VieAI (chỉ hiện các gói user chưa có).
                    </Typography>
                    <TextField
                        select
                        fullWidth
                        label="Gói dịch vụ"
                        value={addTemplateId}
                        onChange={(e) => setAddTemplateId(e.target.value)}
                        margin="dense"
                    >
                        {(catalogQuery.data ?? [])
                            .filter((c) => {
                                const owned = new Set((detailQuery.data?.items ?? []).map((i) => i.name));
                                return !owned.has(c.name);
                            })
                            .map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.name}
                                    {c.description ? ` — ${c.description}` : ""}
                                </MenuItem>
                            ))}
                    </TextField>
                    <TextField
                        margin="dense"
                        fullWidth
                        label="Hạn sau (ngày từ hôm nay)"
                        type="number"
                        value={addExpiryDays}
                        onChange={(e) => setAddExpiryDays(e.target.value)}
                        inputProps={{ min: 1, max: 3650 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void handleAddService()} disabled={!addTemplateId}>
                        Thêm
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={limitOpen} onClose={() => setLimitOpen(false)}>
                <DialogTitle>Giới hạn token mỗi tháng</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Để trống để bỏ giới hạn. Đếm theo tổng tokens_used của tin trợ lý trong tháng.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Token / tháng"
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        placeholder="Ví dụ: 500000"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLimitOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void handleSaveLimit()}>
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
