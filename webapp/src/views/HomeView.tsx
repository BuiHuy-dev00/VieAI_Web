// src/views/HomeView.tsx
import * as React from "react";
import Add from "@mui/icons-material/Add";
import AttachFile from "@mui/icons-material/AttachFile";
import ChatBubbleOutline from "@mui/icons-material/ChatBubbleOutline";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import Check from "@mui/icons-material/Check";
import DiamondOutlined from "@mui/icons-material/DiamondOutlined";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import {
    Box,
    Button,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
    Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/Auth/AuthContext.tsx";
import PricingUpgradeDialog from "../components/PricingUpgradeDialog.tsx";
import { useData, type ChatSessionRow } from "../components/DataHandler/DataContext.tsx";
import ChatMarkdown from "../components/chat/ChatMarkdown.tsx";
import { useStore, type VieGptPlanId } from "../hooks/useStore.ts";
import {
    modeToReasoningEffort,
    normalizeChatLineBreaks,
    planToOpenAIModel,
    type ChatModeId,
} from "../chat/vieGptModel.ts";

type SvgIconProps = React.SVGProps<SVGSVGElement>;

type NavItemProps = {
    open: boolean;
    icon: React.ReactNode;
    label: string;
    selected: boolean;
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
    highlightable?: boolean;
};

type SidebarProps = {
    open: boolean;
    children: React.ReactNode;
    onToggle: () => void;
};

type ItemDef = { label: string; icon: React.ReactNode };


// --- Icons ---
const ChevronLeftIcon: React.FC<SvgIconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
);

const ChevronRightIcon: React.FC<SvgIconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
);

/** ChatGPT / OpenAI-style mark (simplified) */
const ChatGptLogoIcon: React.FC<SvgIconProps> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="currentColor"
        aria-hidden
    >
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.096 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.889A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 17.663a4.476 4.476 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.288zm.93-9.679a4.471 4.471 0 0 1 2.365-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 3.2 8.228zm15.269 3.448-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.499 4.499 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.499 4.499 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
);

const SettingsIcon: React.FC<SvgIconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.38-1.07-.73-1.69-.99l-.39-2.62c-.05-.28-.3-.5-.58-.5h-4c-.28 0-.53.22-.58.5L9.9 5.34c-.62.26-1.17.61-1.69.99l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.38 1.07.73 1.69.99l.39 2.62c.05.28.3.5.58.5h4c.28 0 .53-.22.58-.5l.39-2.62c.62-.26 1.17-.61 1.69-.99l2.49 1c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
    </svg>
);

const NotificationsNoneIcon: React.FC<SvgIconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V9c0-3.07-1.63-5.64-4.5-6.32V2c0-.55-.45-1-1-1s-1 .45-1 1v.68C7.63 3.36 6 5.93 6 9v7l-2 2v1h16v-1l-2-2zm-2 1H8v-8c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v8z" />
    </svg>
);

const HelpOutlineIcon: React.FC<SvgIconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92c-.44.43-.72.84-.72 1.65h-2c0-.83.35-1.56.88-2.09l1.45-1.44c.3-.3.47-.68.47-1.11 0-.79-.57-1.42-1.33-1.42-.72 0-1.28.53-1.33 1.25H8.26c.06-1.56 1.4-2.77 3.74-2.77 2.1 0 3.74 1.45 3.74 3.42 0 .66-.27 1.28-.7 1.76z" />
    </svg>
);

const LogoutIcon: React.FC<SvgIconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22px" height="22px">
        <path d="M17 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2h-2v2H7V5h8v2h2Zm3.59 5-3.3-3.29-1.42 1.41L16.76 11H10v2h6.76l-1.89 1.88 1.42 1.42L20.59 12Z" />
    </svg>
);

const PAGE_BG = "#F6F7FB";
const SIDEBAR_BG = "#FFFFFF";
const MAIN_BG = "#FFFFFF";
const BORDER = "rgba(15, 23, 42, 0.12)";
const TEXT = "#0F172A";
const MUTED = "rgba(15, 23, 42, 0.70)";
const HOVER_BG = "rgba(15, 23, 42, 0.04)";
const SELECTED_BG = "rgba(37, 99, 235, 0.10)";
const SELECTED_COLOR = "#2563EB";
/** Service card: unselected vs selected (darker) */
const SERVICE_CARD_BG = "#FFFFFF";
const SERVICE_CARD_BG_SELECTED = "rgba(15, 23, 42, 0.085)";

/** Tạm thời: chỉ thẻ ChatGPT được chọn / tương tác; các dịch vụ khác vô hiệu. */
function isServiceSelectable(item: { name: string }): boolean {
    return /chatgpt/i.test(item.name.trim());
}

const CHAT_MODEL_STORAGE_KEY = "portal.chatModel.v2";

export type ChatModelId = ChatModeId;

const CHAT_MODELS: {
    id: ChatModelId;
    label: string;
    description: string;
    Icon: React.FC<{ sx?: object }>;
}[] = [
    {
        id: "gpt54",
        label: "GPT 5.4",
        description: "Phiên bản mới, cân bằng tốc độ và chất lượng",
        Icon: AutoAwesomeOutlined,
    },
    {
        id: "instant",
        label: "Instant",
        description: "Phản hồi nhanh, phù hợp câu hỏi ngắn",
        Icon: BoltOutlined,
    },
    {
        id: "thinking",
        label: "Thinking",
        description: "Suy luận kỹ hơn trước khi trả lời",
        Icon: LightbulbOutlined,
    },
    {
        id: "pro",
        label: "Pro",
        description: "Chất lượng cao cho tác vụ phức tạp",
        Icon: DiamondOutlined,
    },
];

function readStoredChatModel(): ChatModelId {
    try {
        const raw = localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
        if (raw === "gpt54" || raw === "instant" || raw === "thinking" || raw === "pro") return raw;
    } catch {
        /* ignore */
    }
    return "gpt54";
}

async function readFileAsBase64Part(file: File): Promise<{ mimeType: string; data: string }> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const s = String(r.result ?? "");
            const m = /^data:([^;]+);base64,(.+)$/i.exec(s);
            if (m) resolve({ mimeType: m[1], data: m[2] });
            else reject(new Error("Không đọc được ảnh"));
        };
        r.onerror = () => reject(r.error ?? new Error("read error"));
        r.readAsDataURL(file);
    });
}

const COLLAPSED = 76;
const EXPANDED = 320;

type ShellProps = React.ComponentProps<typeof Box>;

const Shell: React.FC<ShellProps> = (props) => (
    <Box
        sx={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            background: PAGE_BG,
            padding: 2,
            boxSizing: "border-box",
            gap: 2,
            overflow: "hidden",
        }}
        {...props}
    />
);

const Sidebar: React.FC<SidebarProps> = ({ open, children, onToggle }) => {
    const TOGGLE_SIZE = 34;
    const TOGGLE_HALF = TOGGLE_SIZE / 2;

    return (
        <Box
            sx={{
                width: open ? EXPANDED : COLLAPSED,
                height: "100%",
                transition: "width 220ms ease-in-out",
                background: SIDEBAR_BG,
                color: TEXT,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                position: "relative",
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                overflow: "visible",
            }}
        >
            <IconButton
                onClick={onToggle}
                size="small"
                aria-label={open ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}
                sx={(theme) => ({
                    position: "absolute",
                    top: "50%",
                    right: -TOGGLE_HALF,
                    transform: "translateY(-50%)",
                    zIndex: theme.zIndex.modal - 1,
                    width: TOGGLE_SIZE,
                    height: TOGGLE_SIZE,
                    borderRadius: 999,
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.14)",
                    "&:hover": { background: "white" },
                })}
            >
                {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>

            <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 3 }}>
                {children}
            </Box>
        </Box>
    );
};

const Main = (props: React.ComponentProps<typeof Box>) => (
    <Box
        sx={{
            flex: 1,
            height: "100%",
            minWidth: 0,
            background: MAIN_BG,
            color: TEXT,
            padding: 5,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 2,
        }}
        {...props}
    />
);

const NavItem: React.FC<NavItemProps> = ({ open, icon, label, selected, onClick, highlightable = true }) => (
    <Tooltip title={!open ? label : ""} placement="right">
        <ListItemButton
            onClick={onClick}
            selected={highlightable ? selected : false}
            sx={{
                mx: 1.25,
                my: 0.5,
                borderRadius: 2,
                minHeight: 50,
                justifyContent: open ? "initial" : "center",
                px: open ? 2 : 1.5,
                position: "relative",
                outline: "none",
                transition: "background 160ms ease",
                "&:hover": { background: HOVER_BG },

                ...(highlightable && {
                    "&.Mui-selected": { background: SELECTED_BG },
                    "&.Mui-selected:hover": { background: "rgba(37, 99, 235, 0.14)" },
                    "&.Mui-selected::before": {
                        content: '""',
                        position: "absolute",
                        left: 10,
                        top: 10,
                        bottom: 10,
                        width: 3,
                        borderRadius: 99,
                        background: SELECTED_COLOR,
                    },
                }),
            }}
        >
            <ListItemIcon
                sx={{
                    minWidth: 0,
                    mr: open ? 2 : 0,
                    justifyContent: "center",
                    color: highlightable && selected ? SELECTED_COLOR : "rgba(15, 23, 42, 0.75)",
                }}
            >
                {icon}
            </ListItemIcon>

            <ListItemText
                primary={label}
                sx={{
                    opacity: open ? 1 : 0,
                    whiteSpace: "nowrap",
                    "& .MuiListItemText-primary": {
                        color: "rgba(15, 23, 42, 0.90)",
                        fontWeight: highlightable && selected ? 700 : 600,
                    },
                }}
            />
        </ListItemButton>
    </Tooltip>
);

export default function HomeView(): React.JSX.Element {
    const [open, setOpen] = React.useState<boolean>(true);

    const [settingsAnchorEl, setSettingsAnchorEl] = React.useState<HTMLElement | null>(null);
    const settingsMenuOpen = Boolean(settingsAnchorEl);
    const [pricingOpen, setPricingOpen] = React.useState(false);
    const navigate = useNavigate();

    const { logout, user: authUser } = useAuth();
    const user = useStore((s) => s.user);
    const vieGptPlan = useStore((s) => s.vieGptPlan);
    const setVieGptPlan = useStore((s) => s.setVieGptPlan);
    const chatGptHeaderTitle = `CHATGPT VIEAI - ${vieGptPlan.toUpperCase()}`;
    const {
        sessionId,
        messages,
        sendMessage,
        isStreaming,
        abortStreaming,
        chatSessions,
        selectSession,
        deleteSession,
        items,
        itemsLoading,
        itemsError,
        fetchItems,
        renewItem,
        startNewChat,
    } = useData();

    const [sessionToDelete, setSessionToDelete] = React.useState<ChatSessionRow | null>(null);
    const [deleteLoading, setDeleteLoading] = React.useState(false);

    const [draft, setDraft] = React.useState<string>("");
    const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [renewingId, setRenewingId] = React.useState<string | null>(null);
    const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);
    const [modelMenuAnchor, setModelMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [selectedChatModel, setSelectedChatModel] = React.useState<ChatModelId>(() => readStoredChatModel());

    React.useEffect(() => {
        try {
            localStorage.setItem(CHAT_MODEL_STORAGE_KEY, selectedChatModel);
        } catch {
            /* ignore */
        }
    }, [selectedChatModel]);

    const currentChatModel = CHAT_MODELS.find((m) => m.id === selectedChatModel) ?? CHAT_MODELS[0];

    React.useEffect(() => {
        if (!items?.length) {
            setSelectedServiceId(null);
            return;
        }
        const chatgpt = items.find((i) => isServiceSelectable(i));
        if (chatgpt) {
            setSelectedServiceId(chatgpt.id);
            return;
        }
        setSelectedServiceId(items[0].id);
    }, [items]);
    const scrollRef = React.useRef<HTMLDivElement | null>(null);

    const bottomItems: ItemDef[] = [
        { label: "Cài đặt", icon: <SettingsIcon /> },
        { label: "Thông báo", icon: <NotificationsNoneIcon /> },
        { label: "Hỗ trợ", icon: <HelpOutlineIcon /> },
    ];

    const handleOpenSettingsMenu = (event: React.MouseEvent<HTMLElement>) => setSettingsAnchorEl(event.currentTarget);
    const handleCloseSettingsMenu = () => setSettingsAnchorEl(null);

    const handleLogout = async () => {
        handleCloseSettingsMenu();
        await logout();
    };

    React.useEffect(() => {
        fetchItems().catch(() => {});
    }, [fetchItems]);

    React.useEffect(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        });
    }, [messages]);

    const handleConfirmDeleteSession = React.useCallback(async () => {
        if (!sessionToDelete) return;
        setDeleteLoading(true);
        try {
            await deleteSession(sessionToDelete.id);
            setSessionToDelete(null);
        } catch (e) {
            window.alert(e instanceof Error ? e.message : "Không xóa được đoạn chat.");
        } finally {
            setDeleteLoading(false);
        }
    }, [sessionToDelete, deleteSession]);

    const handleSend = React.useCallback(async () => {
        if (!draft.trim() && pendingFiles.length === 0) return;
        const text = normalizeChatLineBreaks(draft);
        if (!text && pendingFiles.length === 0) return;
        const files = pendingFiles;
        setDraft("");
        setPendingFiles([]);
        const imageParts =
            files.length > 0 ? await Promise.all(files.map((f) => readFileAsBase64Part(f))) : undefined;
        const model = planToOpenAIModel(vieGptPlan);
        const reasoning_effort = modeToReasoningEffort(vieGptPlan, selectedChatModel);
        await sendMessage(text, imageParts, {
            model,
            ...(reasoning_effort != null ? { reasoning_effort } : {}),
        });
    }, [draft, pendingFiles, sendMessage, vieGptPlan, selectedChatModel]);

    return (
        <Shell>
            <CssBaseline />

            <Sidebar open={open} onToggle={() => setOpen((v) => !v)}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.75,
                        px: 2,
                        py: 2,
                        minHeight: 76,
                        borderBottom: `1px solid ${BORDER}`,
                        background: "linear-gradient(180deg, rgba(37,99,235,0.06) 0%, rgba(255,255,255,0) 70%)",
                        flexShrink: 0,
                    }}
                >
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            background: "linear-gradient(145deg, rgba(16,163,127,0.12) 0%, rgba(37,99,235,0.1) 100%)",
                            border: "1px solid rgba(15, 23, 42, 0.1)",
                            flexShrink: 0,
                            color: "#10A37F",
                        }}
                    >
                        <ChatGptLogoIcon />
                    </Box>

                    <Tooltip title={!open ? chatGptHeaderTitle : ""} placement="right">
                        <Typography
                            variant="h6"
                            component="div"
                            title={chatGptHeaderTitle}
                            sx={{
                                color: TEXT,
                                minWidth: 0,
                                flex: 1,
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                                lineHeight: 1.2,
                                fontSize: open ? 18 : 11,
                                textAlign: open ? "left" : "center",
                                whiteSpace: open ? "normal" : "nowrap",
                                overflow: "hidden",
                                textOverflow: open ? "clip" : "ellipsis",
                            }}
                        >
                            {open ? chatGptHeaderTitle : vieGptPlan.toUpperCase()}
                        </Typography>
                    </Tooltip>
                </Box>

                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                    <List sx={{ py: 1.1, flexShrink: 0 }}>
                        <Tooltip title={!open ? "Đoạn Chat Mới" : ""} placement="right">
                            <ListItemButton
                                onClick={() => {
                                    startNewChat().catch(() => {});
                                }}
                                sx={{
                                    mx: 1.25,
                                    my: 0.5,
                                    borderRadius: 2,
                                    minHeight: 50,
                                    justifyContent: open ? "flex-start" : "center",
                                    px: open ? 2 : 1.5,
                                    gap: open ? 1 : 0,
                                    transition: "background 160ms ease",
                                    border: `1px solid transparent`,
                                    "&:hover": { background: HOVER_BG },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: open ? 1.25 : 0,
                                        justifyContent: "center",
                                        color: SELECTED_COLOR,
                                    }}
                                >
                                    <Add fontSize="small" />
                                </ListItemIcon>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        flex: 1,
                                        minWidth: 0,
                                        opacity: open ? 1 : 0,
                                        width: open ? "auto" : 0,
                                        overflow: "hidden",
                                    }}
                                >
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: "rgba(15, 23, 42, 0.9)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Đoạn Chat Mới
                                    </Typography>
                                </Box>
                            </ListItemButton>
                        </Tooltip>
                    </List>

                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: "auto",
                            overflowX: "hidden",
                            px: 0.5,
                            mx: 0.5,
                            "&::-webkit-scrollbar": { width: 6 },
                            "&::-webkit-scrollbar-thumb": {
                                background: "rgba(15, 23, 42, 0.25)",
                                borderRadius: 99,
                            },
                        }}
                    >
                        <List dense sx={{ py: 0 }}>
                            {chatSessions.map((s) => {
                                const selected = sessionId === s.id;
                                return (
                                    <Box
                                        key={s.id}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.25,
                                            mx: 0.75,
                                            my: 0.25,
                                            px: open ? 1 : 0.65,
                                            py: 0.5,
                                            borderRadius: 2,
                                            minHeight: 44,
                                            bgcolor: selected ? SELECTED_BG : "transparent",
                                            border: selected ? "1px solid rgba(37, 99, 235, 0.22)" : "1px solid transparent",
                                            transition: "background 0.15s ease, border-color 0.15s ease",
                                            "&:hover": {
                                                bgcolor: selected ? "rgba(37, 99, 235, 0.14)" : HOVER_BG,
                                            },
                                        }}
                                    >
                                        <Tooltip title={!open ? s.title : ""} placement="right">
                                            <Box
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => selectSession(s.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        selectSession(s.id);
                                                    }
                                                }}
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: open ? 1 : 0,
                                                    cursor: "pointer",
                                                    justifyContent: open ? "flex-start" : "center",
                                                }}
                                            >
                                                <ChatBubbleOutline
                                                    sx={{
                                                        fontSize: 20,
                                                        flexShrink: 0,
                                                        color: selected ? SELECTED_COLOR : "rgba(15, 23, 42, 0.55)",
                                                    }}
                                                />
                                                {open && (
                                                    <Typography
                                                        noWrap
                                                        sx={{
                                                            fontSize: 13.5,
                                                            fontWeight: selected ? 700 : 500,
                                                            color: selected ? TEXT : "rgba(15, 23, 42, 0.85)",
                                                        }}
                                                    >
                                                        {s.title}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Tooltip>
                                        <Tooltip title="Xóa đoạn chat" placement="left">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled={isStreaming}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSessionToDelete(s);
                                                    }}
                                                    sx={{
                                                        flexShrink: 0,
                                                        color: "#dc2626",
                                                        p: 0.35,
                                                        "&:hover": { bgcolor: "rgba(220, 38, 38, 0.1)" },
                                                    }}
                                                    aria-label="Xóa đoạn chat"
                                                >
                                                    <DeleteOutline sx={{ fontSize: 20 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                );
                            })}
                        </List>
                    </Box>

                    <Divider sx={{ borderColor: BORDER, mx: 2 }} />

                    <Box
                        sx={{
                            px: open ? 2 : 1,
                            pt: 1.25,
                            pb: 0.75,
                            flexShrink: 0,
                            display: "flex",
                            justifyContent: open ? "stretch" : "center",
                        }}
                    >
                        <Tooltip title={!open ? "Nâng cấp gói" : ""} placement="right">
                            <Button
                                fullWidth={open}
                                variant="contained"
                                disableElevation
                                aria-label="Nâng cấp gói"
                                onClick={() => setPricingOpen(true)}
                                sx={{
                                    position: "relative",
                                    overflow: "hidden",
                                    borderRadius: 2.5,
                                    py: 1.15,
                                    px: open ? 2 : 0,
                                    minHeight: 48,
                                    minWidth: open ? undefined : 48,
                                    justifyContent: "center",
                                    textTransform: "none",
                                    fontFamily: '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif',
                                    fontWeight: 800,
                                    fontSize: 15,
                                    letterSpacing: "0.04em",
                                    WebkitFontSmoothing: "antialiased",
                                    MozOsxFontSmoothing: "grayscale",
                                    color: "#fff",
                                    border: "1px solid rgba(255,255,255,0.22)",
                                    background: "linear-gradient(135deg, #1d4ed8 0%, #6366f1 42%, #9333ea 100%)",
                                    backgroundSize: "180% 180%",
                                    boxShadow: "0 8px 22px rgba(79, 70, 229, 0.48)",
                                    transition: "transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease",
                                    "@keyframes upgradeGlow": {
                                        "0%, 100%": {
                                            boxShadow: "0 8px 22px rgba(79, 70, 229, 0.48)",
                                            filter: "brightness(1)",
                                        },
                                        "50%": {
                                            boxShadow: "0 10px 28px rgba(147, 51, 234, 0.55)",
                                            filter: "brightness(1.06)",
                                        },
                                    },
                                    "@keyframes upgradeSheen": {
                                        "0%": { transform: "translateX(-120%)" },
                                        "45%, 100%": { transform: "translateX(120%)" },
                                    },
                                    animation: "upgradeGlow 3.2s ease-in-out infinite",
                                    "&::before": {
                                        content: '""',
                                        position: "absolute",
                                        inset: 0,
                                        background:
                                            "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.2) 45%, transparent 72%)",
                                        animation: "upgradeSheen 3.5s ease-in-out infinite",
                                        pointerEvents: "none",
                                    },
                                    "&:hover": {
                                        background: "linear-gradient(135deg, #1e40af 0%, #4f46e5 48%, #7e22ce 100%)",
                                        boxShadow: "0 12px 32px rgba(79, 70, 229, 0.58)",
                                        transform: "translateY(-2px)",
                                        animation: "none",
                                        filter: "brightness(1.05)",
                                    },
                                    "&:active": {
                                        transform: "translateY(0)",
                                    },
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        position: "relative",
                                        zIndex: 1,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: open ? 0.85 : 0,
                                    }}
                                >
                                    <AutoAwesome
                                        sx={{
                                            fontSize: open ? 22 : 24,
                                            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.22))",
                                        }}
                                    />
                                    {open ? "Nâng cấp gói" : null}
                                </Box>
                            </Button>
                        </Tooltip>
                    </Box>

                    <List sx={{ py: 1.1, overflow: "hidden" }}>
                        {bottomItems.map((item) => {
                            if (item.label === "Cài đặt") {
                                return (
                                    <NavItem
                                        key={item.label}
                                        open={open}
                                        icon={item.icon}
                                        label={item.label}
                                        selected={false}
                                        onClick={handleOpenSettingsMenu}
                                        highlightable={false}
                                    />
                                );
                            }
                            return (
                                <NavItem
                                    key={item.label}
                                    open={open}
                                    icon={item.icon}
                                    label={item.label}
                                    selected={false}
                                    onClick={() => {}}
                                    highlightable={false}
                                />
                            );
                        })}
                    </List>
                </Box>
            </Sidebar>

            <PricingUpgradeDialog
                open={pricingOpen}
                onClose={() => setPricingOpen(false)}
                onStartPayment={(planId) => {
                    setVieGptPlan(planId as VieGptPlanId);
                    navigate(`/payment?plan=${planId}`);
                }}
            />

            <Dialog
                open={sessionToDelete != null}
                onClose={() => !deleteLoading && setSessionToDelete(null)}
                aria-labelledby="delete-session-title"
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle id="delete-session-title" sx={{ fontWeight: 800 }}>
                    Xóa đoạn chat?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
                        Bạn có chắc muốn xóa đoạn chat{" "}
                        <Box component="span" sx={{ fontWeight: 800, color: TEXT }}>
                            {sessionToDelete?.title ?? ""}
                        </Box>
                        ? Toàn bộ tin nhắn sẽ bị xóa vĩnh viễn và không thể khôi phục.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setSessionToDelete(null)}
                        disabled={deleteLoading}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disableElevation
                        disabled={deleteLoading}
                        onClick={() => void handleConfirmDeleteSession()}
                        sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
                    >
                        {deleteLoading ? "Đang xóa…" : "Xóa"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Menu
                anchorEl={settingsAnchorEl}
                open={settingsMenuOpen}
                onClose={handleCloseSettingsMenu}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: 2,
                        border: `1px solid ${BORDER}`,
                        boxShadow: "0 18px 38px rgba(15, 23, 42, 0.14)",
                        overflow: "hidden",
                        minWidth: 220,
                    },
                }}
            >
                {authUser?.is_admin && (
                    <MenuItem
                        onClick={() => {
                            handleCloseSettingsMenu();
                            navigate("/admin");
                        }}
                        sx={{ gap: 1.2, py: 1.1 }}
                    >
                        <ListItemIcon sx={{ minWidth: 0, color: "rgba(15, 23, 42, 0.82)" }}>
                            <AdminPanelSettingsOutlined />
                        </ListItemIcon>
                        <ListItemText
                            primary="Quản trị người dùng"
                            primaryTypographyProps={{ fontWeight: 700, color: "rgba(15, 23, 42, 0.92)" }}
                        />
                    </MenuItem>
                )}
                <MenuItem onClick={handleLogout} sx={{ gap: 1.2, py: 1.1 }}>
                    <ListItemIcon sx={{ minWidth: 0, color: "rgba(15, 23, 42, 0.82)" }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary="Đăng xuất"
                        primaryTypographyProps={{ fontWeight: 700, color: "rgba(15, 23, 42, 0.92)" }}
                    />
                </MenuItem>
            </Menu>

            <Main>
                {/* ✅ Items wrapper: overflow must be visible so horizontal scrollbar can show */}
                <Box
                    sx={{
                        border: `1px solid ${BORDER}`,
                        borderRadius: 3,
                        background: "#fff",
                        boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
                        overflow: "visible", // ✅ IMPORTANT
                        flex: "0 0 auto",
                    }}
                >
                    <Box sx={{ p: 2.25 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
                            <Typography sx={{ fontWeight: 650, fontSize: 15 }}>
                                Danh sách dịch vụ ({items?.length ?? 0})
                            </Typography>

                            <Box sx={{ flex: 1 }} />

                            <Typography
                                onClick={() => fetchItems()}
                                sx={{
                                    fontSize: 12,
                                    color: SELECTED_COLOR,
                                    cursor: "pointer",
                                    fontWeight: 900,
                                    userSelect: "none",
                                    "&:hover": { color: "#1D4ED8" },
                                }}
                            >
                                Làm mới
                            </Typography>
                        </Box>

                        {itemsLoading ? (
                            <Typography sx={{ fontSize: 13, color: MUTED }}>Đang tải danh sách…</Typography>
                        ) : itemsError ? (
                            <Typography sx={{ fontSize: 13, color: "rgba(220,38,38,0.92)" }}>{itemsError}</Typography>
                        ) : !items || items.length === 0 ? (
                            <Typography sx={{ fontSize: 13, color: MUTED }}>Không có dịch vụ nào.</Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "nowrap",
                                    gap: 1,

                                    overflowX: "auto",
                                    overflowY: "hidden",
                                    WebkitOverflowScrolling: "touch",

                                    width: "100%",
                                    minWidth: 0,

                                    pb: 1,

                                    "&::-webkit-scrollbar": { height: 8 },
                                    "&::-webkit-scrollbar-thumb": {
                                        background: "rgba(15, 23, 42, 0.3)",
                                        borderRadius: 99,
                                    },
                                    "&::-webkit-scrollbar-track": {
                                        background: "rgba(15, 23, 42, 0.08)",
                                        borderRadius: 99,
                                    },

                                    scrollbarWidth: "thin",
                                    scrollbarColor: "rgba(15, 23, 42, 0.3) rgba(15, 23, 42, 0.08)",
                                }}
                            >
                                {items.map((it) => {
                                    const iconSrc =
                                        it.icon_url?.startsWith("http") || it.icon_url?.startsWith("data:")
                                            ? it.icon_url
                                            : `${import.meta.env.VITE_APP_API_URL}${it.icon_url}`;

                                    const expiry = it.expiry_date ? new Date(it.expiry_date) : null;
                                    const isChatGptCard = /chatgpt/i.test(it.name.trim());
                                    const expiryLabel = isChatGptCard
                                        ? expiry
                                            ? expiry.toLocaleDateString()
                                            : "—"
                                        : "--/--/----";

                                    const enabled = isServiceSelectable(it);
                                    const isSelected = enabled && selectedServiceId === it.id;

                                    return (
                                        <Box
                                            key={it.id}
                                            role={enabled ? "button" : "group"}
                                            tabIndex={enabled ? 0 : -1}
                                            aria-disabled={!enabled}
                                            onClick={() => {
                                                if (!enabled) return;
                                                setSelectedServiceId(it.id);
                                            }}
                                            onKeyDown={(e) => {
                                                if (!enabled) return;
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setSelectedServiceId(it.id);
                                                }
                                            }}
                                            sx={{
                                                flex: "0 0 calc((100% - 5 * 8px) / 6)",
                                                minWidth: 170, // ✅ forces overflow on smaller screens
                                                border: isSelected
                                                    ? `2px solid ${SELECTED_COLOR}`
                                                    : `1px solid ${BORDER}`,
                                                borderRadius: 2,
                                                background: isSelected ? SERVICE_CARD_BG_SELECTED : SERVICE_CARD_BG,
                                                boxShadow: isSelected
                                                    ? "0 6px 16px rgba(37, 99, 235, 0.12)"
                                                    : "0 6px 14px rgba(15, 23, 42, 0.05)",
                                                p: 1.0,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 0.65,
                                                cursor: enabled ? "pointer" : "not-allowed",
                                                outline: "none",
                                                opacity: enabled ? 1 : 0.48,
                                                filter: enabled ? "none" : "grayscale(0.25)",
                                                transition: "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
                                                ...(enabled
                                                    ? {
                                                          "&:hover": {
                                                              background: isSelected
                                                                  ? SERVICE_CARD_BG_SELECTED
                                                                  : "rgba(15, 23, 42, 0.04)",
                                                          },
                                                          "&:focus-visible": {
                                                              boxShadow: `0 0 0 3px ${SELECTED_BG}`,
                                                          },
                                                      }
                                                    : {
                                                          pointerEvents: "none",
                                                      }),
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
                                                <Box
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 1.5,
                                                        border: `1px solid ${BORDER}`,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        background: "rgba(15,23,42,0.03)",
                                                        overflow: "hidden",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src={iconSrc}
                                                        alt={it.name}
                                                        sx={{ width: 20, height: 20, objectFit: "contain" }}
                                                        onError={(e: any) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                </Box>

                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontWeight: 900, color: TEXT, fontSize: 12.5 }} noWrap>
                                                        {it.name}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Typography
                                                sx={{
                                                    color: "rgba(15,23,42,0.82)",
                                                    fontSize: 11.5,
                                                    lineHeight: 1.25,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {it.description ?? ""}
                                            </Typography>

                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <Typography sx={{ fontSize: 10.5, color: MUTED }} noWrap>
                                                    Hết hạn:{" "}
                                                    <Box component="span" sx={{ color: TEXT, fontWeight: 900 }}>
                                                        {expiryLabel}
                                                    </Box>
                                                </Typography>

                                                <Box sx={{ flex: 1 }} />

                                                {enabled &&
                                                    (it.available_actions ?? []).includes("renew") &&
                                                    user != null &&
                                                    Number(user.id) === it.user_id && (
                                                        <Button
                                                            type="button"
                                                            variant="outlined"
                                                            size="small"
                                                            disabled={renewingId === it.id}
                                                            onClick={async (ev) => {
                                                                ev.stopPropagation();
                                                                setRenewingId(it.id);
                                                                try {
                                                                    await renewItem(it.id);
                                                                } catch (err: unknown) {
                                                                    const msg =
                                                                        err instanceof Error
                                                                            ? err.message
                                                                            : "Gia hạn thất bại";
                                                                    window.alert(msg);
                                                                } finally {
                                                                    setRenewingId(null);
                                                                }
                                                            }}
                                                            sx={{
                                                                minWidth: 0,
                                                                px: 1.25,
                                                                py: 0.35,
                                                                fontSize: 10.5,
                                                                fontWeight: 800,
                                                                lineHeight: 1.2,
                                                                textTransform: "none",
                                                                borderColor: BORDER,
                                                                color: TEXT,
                                                                "&:hover": {
                                                                    borderColor: SELECTED_COLOR,
                                                                    background: "rgba(37, 99, 235, 0.06)",
                                                                },
                                                            }}
                                                        >
                                                            Gia Hạn
                                                        </Button>
                                                    )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Chat */}
                <Box
                    sx={{
                        flex: 1.6,
                        minHeight: 0,
                        borderRadius: 3,
                        border: `1px solid ${BORDER}`,
                        background: "#FFFFFF",
                        boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            px: 2,
                            py: 1.5,
                            borderBottom: `1px solid ${BORDER}`,
                            flexShrink: 0,
                        }}
                    >
                        <Typography sx={{ fontWeight: 650, fontSize: 14, color: TEXT }}>Trợ lý chat</Typography>

                        <Box sx={{ flex: 1 }} />

                        {isStreaming && (
                            <Typography
                                onClick={() => abortStreaming()}
                                sx={{
                                    fontSize: 12,
                                    color: SELECTED_COLOR,
                                    cursor: "pointer",
                                    userSelect: "none",
                                    mr: 1.5,
                                    fontWeight: 800,
                                    "&:hover": { color: "#1D4ED8" },
                                }}
                            >
                                Dừng
                            </Typography>
                        )}

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.85, flexShrink: 0 }}>
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 650,
                                    color: MUTED,
                                    userSelect: "none",
                                }}
                            >
                                Model
                            </Typography>
                            <Button
                                id="chat-model-button"
                                aria-haspopup="true"
                                aria-expanded={Boolean(modelMenuAnchor)}
                                aria-controls={modelMenuAnchor ? "chat-model-menu" : undefined}
                                disableElevation
                                variant="outlined"
                                size="small"
                                endIcon={
                                    <KeyboardArrowDown
                                        sx={{
                                            fontSize: 20,
                                            color: "rgba(15, 23, 42, 0.55)",
                                            transition: "transform 0.2s",
                                            transform: modelMenuAnchor ? "rotate(180deg)" : "none",
                                        }}
                                    />
                                }
                                onClick={(e) => setModelMenuAnchor(e.currentTarget)}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 750,
                                    fontSize: 13,
                                    color: TEXT,
                                    borderColor: BORDER,
                                    borderRadius: 2,
                                    px: 1.25,
                                    py: 0.35,
                                    minWidth: 132,
                                    justifyContent: "space-between",
                                    background: "#fff",
                                    "&:hover": {
                                        borderColor: "rgba(15, 23, 42, 0.22)",
                                        background: "rgba(15, 23, 42, 0.02)",
                                    },
                                }}
                            >
                                {currentChatModel.label}
                            </Button>
                        </Box>

                        <Menu
                            id="chat-model-menu"
                            anchorEl={modelMenuAnchor}
                            open={Boolean(modelMenuAnchor)}
                            onClose={() => setModelMenuAnchor(null)}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                            slotProps={{
                                paper: {
                                    sx: {
                                        mt: 1,
                                        minWidth: 300,
                                        maxWidth: 360,
                                        borderRadius: 3,
                                        border: `1px solid ${BORDER}`,
                                        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                                        py: 0.5,
                                    },
                                },
                            }}
                        >
                            {CHAT_MODELS.map((m) => {
                                const IconComp = m.Icon;
                                const selected = selectedChatModel === m.id;
                                return (
                                    <MenuItem
                                        key={m.id}
                                        selected={selected}
                                        onClick={() => {
                                            setSelectedChatModel(m.id);
                                            setModelMenuAnchor(null);
                                        }}
                                        sx={{
                                            py: 1.25,
                                            px: 1.5,
                                            alignItems: "flex-start",
                                            gap: 1,
                                            borderRadius: 2,
                                            mx: 0.5,
                                            my: 0.25,
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, mt: 0.2 }}>
                                            <IconComp
                                                sx={{
                                                    fontSize: 22,
                                                    color: selected ? SELECTED_COLOR : "rgba(15, 23, 42, 0.75)",
                                                }}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={m.label}
                                            secondary={m.description}
                                            primaryTypographyProps={{
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: TEXT,
                                            }}
                                            secondaryTypographyProps={{
                                                fontSize: 12,
                                                sx: { color: MUTED, mt: 0.35 },
                                            }}
                                        />
                                        {selected && (
                                            <Check sx={{ fontSize: 20, color: SELECTED_COLOR, flexShrink: 0, mt: 0.25 }} />
                                        )}
                                    </MenuItem>
                                );
                            })}
                        </Menu>
                    </Box>

                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: "auto",
                            p: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            background: "linear-gradient(180deg, rgba(15,23,42,0.03) 0%, rgba(255,255,255,0) 55%)",
                        }}
                    >
                        {messages.length === 0 ? (
                            <Typography sx={{ fontSize: 13, color: MUTED }}>Bắt đầu cuộc trò chuyện…</Typography>
                        ) : (
                            messages.map((m) => {
                                const isUser = m.role === "user";

                                return (
                                    <Box
                                        key={m.id}
                                        sx={{
                                            width: "100%",
                                            display: "flex",
                                            justifyContent: isUser ? "flex-end" : "flex-start",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: isUser ? "flex-end" : "flex-start",
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "inline-block",
                                                    boxSizing: "border-box",
                                                    verticalAlign: "top",
                                                    maxWidth: "min(85%, 520px)",
                                                    minWidth: 0,
                                                    px: 1.25,
                                                    py: 0.9,
                                                    borderRadius: 2.5,
                                                    border: `1px solid ${BORDER}`,
                                                    background: isUser ? "rgba(37, 99, 235, 0.10)" : "#FFFFFF",
                                                    color: TEXT,
                                                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
                                                    whiteSpace: "normal",
                                                    /* `anywhere` gây ngắt giữa từ → dễ 1 ký tự rơi xuống dòng; ưu tiên ngắt tại khoảng trắng */
                                                    overflowWrap: "break-word",
                                                    wordBreak: "normal",
                                                    fontSize: 13.5,
                                                    lineHeight: 1.35,
                                                }}
                                            >
                                                {isUser && m.attachmentUrls && m.attachmentUrls.length > 0 && (
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            gap: 1,
                                                            mb: m.content ? 0.75 : 0,
                                                        }}
                                                    >
                                                        {m.attachmentUrls.map((url, i) => (
                                                            <Box
                                                                key={i}
                                                                component="img"
                                                                src={url}
                                                                alt=""
                                                                sx={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: 200,
                                                                    borderRadius: 1.5,
                                                                    border: `1px solid ${BORDER}`,
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                )}
                                                {m.kind === "image" && m.imageUrl ? (
                                                    <Box
                                                        component="img"
                                                        src={m.imageUrl}
                                                        alt={m.imageId ? `image-${m.imageId}` : "generated"}
                                                        sx={{
                                                            display: "block",
                                                            maxWidth: "100%",
                                                            borderRadius: 2,
                                                            border: `1px solid ${BORDER}`,
                                                        }}
                                                    />
                                                ) : !m.content && m.streaming ? (
                                                    <Typography component="span" sx={{ color: MUTED }}>
                                                        …
                                                    </Typography>
                                                ) : isUser ? (
                                                    <Typography
                                                        component="div"
                                                        sx={{
                                                            /* pre-wrap: giữ đoạn Shift+Enter (\n\n); normalizeChatLineBreaks gỡ \n thừa giữa từ */
                                                            whiteSpace: "pre-wrap",
                                                            overflowWrap: "break-word",
                                                            wordBreak: "normal",
                                                            maxWidth: "100%",
                                                        }}
                                                    >
                                                        {normalizeChatLineBreaks(m.content)}
                                                    </Typography>
                                                ) : (
                                                    <ChatMarkdown content={m.content} variant="assistant" />
                                                )}
                                            </Box>

                                            {!isUser && m.streaming && m.kind !== "image" && (
                                                <Typography sx={{ mt: 0.5, fontSize: 11, color: MUTED, userSelect: "none" }}>
                                                    đang nhập…
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })
                        )}

                        <Box ref={scrollRef} />
                    </Box>

                    <Box
                        sx={{
                            p: 1.5,
                            borderTop: `1px solid ${BORDER}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            background: "#FFFFFF",
                            flexShrink: 0,
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                setPendingFiles((prev) => [...prev, ...files]);
                                e.target.value = "";
                            }}
                        />
                        {pendingFiles.length > 0 && (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                                {pendingFiles.map((f, idx) => (
                                    <Chip
                                        key={`${f.name}-${idx}`}
                                        size="small"
                                        label={f.name}
                                        onDelete={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                                    />
                                ))}
                            </Box>
                        )}
                        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                            <Tooltip title="Đính kèm ảnh">
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={isStreaming}
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{ color: MUTED, mb: 0.25 }}
                                        aria-label="Đính kèm ảnh"
                                    >
                                        <AttachFile fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <TextField
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={
                                    isStreaming
                                        ? "Đang trả lời… (bấm Dừng để hủy)"
                                        : "Nhập tin nhắn… (đính kèm ảnh hoặc dán ảnh Ctrl+V)"
                                }
                                title="Gửi kèm ảnh: nút đính kèm hoặc dán ảnh từ clipboard vào ô này"
                                size="small"
                                fullWidth
                                multiline
                                maxRows={24}
                                disabled={isStreaming}
                                onPaste={(e) => {
                                    const cd = e.clipboardData;
                                    const imageFiles: File[] = [];
                                    if (cd?.files?.length) {
                                        for (let i = 0; i < cd.files.length; i++) {
                                            const f = cd.files[i];
                                            if (f.type.startsWith("image/")) imageFiles.push(f);
                                        }
                                    }
                                    if (imageFiles.length === 0 && cd?.items?.length) {
                                        for (let i = 0; i < cd.items.length; i++) {
                                            const item = cd.items[i];
                                            if (item.kind === "file" && item.type.startsWith("image/")) {
                                                const f = item.getAsFile();
                                                if (f) imageFiles.push(f);
                                            }
                                        }
                                    }
                                    if (imageFiles.length > 0) {
                                        e.preventDefault();
                                        setPendingFiles((prev) => [...prev, ...imageFiles]);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    const isEnter = e.key === "Enter" || e.code === "NumpadEnter";
                                    if (!isEnter || e.shiftKey) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleSend();
                                }}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            />
                            <IconButton
                                onClick={() => void handleSend()}
                                disabled={isStreaming || (!draft.trim() && pendingFiles.length === 0)}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    background: SELECTED_COLOR,
                                    color: "#fff",
                                    "&:hover": { background: "#1D4ED8" },
                                    "&.Mui-disabled": {
                                        background: "rgba(37, 99, 235, 0.25)",
                                        color: "rgba(255,255,255,0.9)",
                                    },
                                }}
                                aria-label="Gửi"
                            >
                                <ChevronRightIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Main>
        </Shell>
    );
}
