// src/components/DataHandler/DataContext.tsx
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { FC, PropsWithChildren } from "react";
import {
    getStoredAccessToken,
    getStoredRefreshToken,
    setStoredTokens,
} from "../../auth/tokenStorage.ts";

type ApiError = { message?: string; statusCode?: number };

// -------------------- Chat Types --------------------
export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt?: string;
    streaming?: boolean;

    kind?: "text" | "image";
    imageUrl?: string;
    imageId?: string;
    /** Ảnh người dùng gửi kèm (data URL), đồng bộ từ server */
    attachmentUrls?: string[];
};

type CreateSessionBody = { title: string };

/** Một đoạn chat trong sidebar (API /api/chat/sessions) */
export type ChatSessionRow = {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
    /** Số tin nhắn (0 = chưa chat) */
    message_count?: number;
};

// -------------------- Items Types --------------------
export type Item = {
    id: string;
    name: string;
    icon_url: string;
    home_url: string;
    description?: string;
    expiry_date?: string;
    status?: string;
    category?: string;
    available_actions?: string[];
    user_id: number;
    created_at?: string;
    updated_at?: string;
};

type ItemsResponse = {
    items: Item[];
    total: number;
    page: number;
    limit: number;
};

// -------------------- Context --------------------
type DataContextValue = {
    // chat
    sessionId: string | null;
    messages: ChatMessage[];
    isStreaming: boolean;
    /** Danh sách đoạn chat (mới nhất trước) — đồng bộ DB */
    chatSessions: ChatSessionRow[];
    fetchChatSessions: () => Promise<ChatSessionRow[]>;
    /** Mở một đoạn chat đã có */
    selectSession: (id: string) => void;
    /** Xóa đoạn chat trên server và cập nhật danh sách */
    deleteSession: (id: string) => Promise<void>;

    ensureSession: (title?: string) => Promise<string>;
    resetSession: () => void;

    /** `images`: base64 parts `{ mimeType, data }` gửi lên OpenAI vision */
    sendMessage: (
        text: string,
        images?: { mimeType: string; data: string }[],
        options?: { model: string; reasoning_effort?: string | null }
    ) => Promise<void>;
    abortStreaming: () => void;

    // items
    items: Item[];
    itemsLoading: boolean;
    itemsError: string | null;
    fetchItems: () => Promise<void>;
    renewItem: (itemId: string) => Promise<void>;
    /** Luôn tạo đoạn chat mới (giống ChatGPT), đoạn cũ xuống dưới trong danh sách */
    startNewChat: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

const API_BASE = import.meta.env.VITE_APP_API_URL;

const CHAT_SESSION_ID_KEY = "chatSessionId";

// -------------------- Token + Refresh --------------------
type RefreshResponse = { accessToken: string; refreshToken: string };

// ✅ shared refresh in-flight promise (prevents multiple refresh calls at once)
let refreshPromise: Promise<RefreshResponse> | null = null;

function getToken() {
    return getStoredAccessToken();
}

function authHeaders(accept: string) {
    const accessToken = getToken();
    return {
        Accept: accept,
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
}

async function refreshTokensOrThrow(): Promise<RefreshResponse> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ refreshToken }),
        })
            .then(async (res) => {
                const json = (await res.json().catch(() => null)) as RefreshResponse | ApiError | null;
                if (!res.ok) {
                    throw new Error((json as ApiError | null)?.message ?? `Refresh failed (${res.status})`);
                }
                return json as RefreshResponse;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    const tokens = await refreshPromise;

    if (tokens?.accessToken && tokens?.refreshToken) {
        setStoredTokens(tokens.accessToken, tokens.refreshToken);
    }

    return tokens;
}

/**
 * ✅ Fetch wrapper:
 * - does request
 * - if 401: refresh + retry once
 */
async function fetchWithRefreshRetry(
    input: RequestInfo | URL,
    init: RequestInit
): Promise<Response> {
    const first = await fetch(input, init);
    if (first.status !== 401) return first;

    // try refresh once
    await refreshTokensOrThrow();

    // rebuild headers with new token
    const newAccess = getToken();
    const headers = new Headers(init.headers as HeadersInit);
    if (newAccess) headers.set("Authorization", `Bearer ${newAccess}`);

    return await fetch(input, { ...init, headers });
}

// -------------------- Utilities --------------------
function extractSessionId(payload: any): string {
    const id = payload?.id ?? payload?.data?.id ?? payload?.sessionId;
    if (!id) throw new Error("Create session response did not include session id");
    return String(id);
}

function uid(prefix = "m") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * SSE text delta parser: returns ONLY displayable text deltas.
 */
function parseSseTextDelta(line: string): string | null {
    if (!line.startsWith("data:")) return null;

    const raw = line.slice("data:".length).trim();
    if (!raw) return null;
    if (raw === "[DONE]") return null;

    try {
        const obj = JSON.parse(raw);

        if (obj?.type === "done" || obj?.done === true) return null;
        if (obj?.type === "text" && typeof obj?.text === "string") return obj.text;

        return null;
    } catch {
        return raw;
    }
}

type SseEvent =
    | { type: "text"; text: string; done?: boolean }
    | { type: "image"; imageId?: string; imageUrl?: string; done?: boolean }
    | { type: "done"; done: true }
    | Record<string, any>;

type ApiDbMessage = {
    id: number;
    role: string;
    content: string;
    attachments?: { mimeType: string; data: string }[] | null;
    created_at?: string;
};

function mapDbMessageToChat(m: ApiDbMessage): ChatMessage {
    const raw = m.attachments;
    const attachmentUrls = Array.isArray(raw)
        ? raw.map((a) => `data:${a.mimeType ?? "image/jpeg"};base64,${a.data}`)
        : [];
    return {
        id: `db_${m.id}`,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content ?? "",
        createdAt: typeof m.created_at === "string" ? m.created_at : undefined,
        kind: "text",
        attachmentUrls,
    };
}

function parseSseJsonEvent(line: string): SseEvent | null {
    if (!line.startsWith("data:")) return null;
    const raw = line.slice("data:".length).trim();
    if (!raw || raw === "[DONE]") return null;

    try {
        return JSON.parse(raw) as SseEvent;
    } catch {
        return null;
    }
}

export const DataProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
    // -------------------- Session --------------------
    const [sessionId, setSessionId] = useState<string | null>(() => {
        const raw = localStorage.getItem(CHAT_SESSION_ID_KEY);
        return raw ? String(raw) : null;
    });

    // -------------------- Chat State --------------------
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [chatSessions, setChatSessions] = useState<ChatSessionRow[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    // -------------------- Items State --------------------
    const [items, setItems] = useState<Item[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);

    const creatingSessionPromiseRef = useRef<Promise<string> | null>(null);
    const sessionIdRef = useRef<string | null>(sessionId);
    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const loadSessionFromApi = useCallback(async (sid: string) => {
        try {
            const res = await fetchWithRefreshRetry(`${API_BASE}/api/chat/sessions/${encodeURIComponent(sid)}`, {
                method: "GET",
                headers: authHeaders("application/json"),
            });
            if (!res.ok) return;
            if (sessionIdRef.current !== sid) return;
            const data = (await res.json()) as { messages?: ApiDbMessage[] };
            const list = Array.isArray(data.messages) ? data.messages : [];
            setMessages(list.map(mapDbMessageToChat));
        } catch {
            /* ignore */
        }
    }, []);

    const fetchChatSessions = useCallback(async (): Promise<ChatSessionRow[]> => {
        try {
            const res = await fetchWithRefreshRetry(`${API_BASE}/api/chat/sessions`, {
                method: "GET",
                headers: authHeaders("application/json"),
            });
            if (!res.ok) return [];
            const data = (await res.json()) as (ChatSessionRow & { message_count?: unknown })[] | null;
            if (!Array.isArray(data)) {
                setChatSessions([]);
                return [];
            }
            const mapped: ChatSessionRow[] = data.map((s) => {
                const mc = s.message_count;
                const message_count =
                    typeof mc === "number" && !Number.isNaN(mc)
                        ? mc
                        : Number.parseInt(String(mc ?? "0"), 10) || 0;
                return {
                    id: String(s.id),
                    title: (s.title && String(s.title).trim()) || "Đoạn chat",
                    created_at: s.created_at,
                    updated_at: s.updated_at,
                    message_count,
                };
            });
            setChatSessions(mapped);
            return mapped;
        } catch {
            /* ignore */
        }
        return [];
    }, []);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
        };
    }, []);

    /** Đồng bộ đoạn chat từ DB theo tài khoản — sau khi stream xong hoặc đổi session */
    useEffect(() => {
        if (!sessionId) {
            setMessages([]);
            return;
        }
        if (isStreaming) return;
        void loadSessionFromApi(sessionId);
    }, [sessionId, isStreaming, loadSessionFromApi]);

    useEffect(() => {
        void fetchChatSessions();
    }, [fetchChatSessions]);

    const wasStreamingRef = useRef(false);
    useEffect(() => {
        if (wasStreamingRef.current && !isStreaming) {
            void fetchChatSessions();
        }
        wasStreamingRef.current = isStreaming;
    }, [isStreaming, fetchChatSessions]);

    // -------------------- Streaming Control --------------------
    const abortStreaming = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsStreaming(false);

        setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === "assistant" && next[i].streaming) {
                    next[i] = { ...next[i], streaming: false };
                    break;
                }
            }
            return next;
        });
    }, []);

    const selectSession = useCallback(
        (id: string) => {
            if (sessionId === id) return;
            if (isStreaming) abortStreaming();
            localStorage.setItem(CHAT_SESSION_ID_KEY, id);
            setSessionId(id);
            setMessages([]);
        },
        [sessionId, isStreaming, abortStreaming]
    );

    const deleteSession = useCallback(
        async (id: string) => {
            if (isStreaming) abortStreaming();
            const res = await fetchWithRefreshRetry(`${API_BASE}/api/chat/sessions/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: authHeaders("application/json"),
            });
            if (!res.ok) {
                const errText = await res.text().catch(() => "");
                throw new Error(errText || `Xóa thất bại (${res.status})`);
            }

            const wasCurrent = sessionId === id;
            setChatSessions((prev) => {
                const next = prev.filter((s) => s.id !== id);
                if (wasCurrent) {
                    if (next.length > 0) {
                        const nid = next[0].id;
                        localStorage.setItem(CHAT_SESSION_ID_KEY, nid);
                        setSessionId(nid);
                        setMessages([]);
                        void loadSessionFromApi(nid);
                    } else {
                        localStorage.removeItem(CHAT_SESSION_ID_KEY);
                        setSessionId(null);
                        setMessages([]);
                    }
                }
                return next;
            });
        },
        [isStreaming, abortStreaming, sessionId, loadSessionFromApi]
    );

    // -------------------- Items Fetch --------------------
    const fetchItems = useCallback(async () => {
        setItemsLoading(true);
        setItemsError(null);

        try {
            const res = await fetchWithRefreshRetry(`${API_BASE}/api/items`, {
                method: "GET",
                headers: authHeaders("application/json"),
            });

            const json = (await res.json().catch(() => null)) as ItemsResponse | ApiError | null;

            if (!res.ok) {
                throw new Error((json as ApiError | null)?.message ?? `Fetch items failed (${res.status})`);
            }

            const data = json as ItemsResponse;
            setItems(Array.isArray(data.items) ? data.items : []);
        } catch (e: any) {
            setItems([]);
            setItemsError(e?.message ?? "Failed to load items");
        } finally {
            setItemsLoading(false);
        }
    }, []);

    const renewItem = useCallback(
        async (itemId: string) => {
            const res = await fetchWithRefreshRetry(`${API_BASE}/api/items/${encodeURIComponent(itemId)}/renew`, {
                method: "POST",
                headers: authHeaders("application/json"),
            });
            const json = (await res.json().catch(() => null)) as
                | { success?: boolean; error?: { message?: string } }
                | null;
            if (!res.ok) {
                const msg = json?.error?.message ?? `Gia hạn thất bại (${res.status})`;
                throw new Error(msg);
            }
            await fetchItems();
        },
        [fetchItems]
    );

    // -------------------- Session --------------------
    const createSession = useCallback(async (body: CreateSessionBody) => {
        const res = await fetchWithRefreshRetry(`${API_BASE}/api/chat/sessions`, {
            method: "POST",
            headers: authHeaders("application/json"),
            body: JSON.stringify(body),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
            throw new Error((json as ApiError | null)?.message ?? `Create session failed (${res.status})`);
        }

        const id = extractSessionId(json);
        localStorage.setItem(CHAT_SESSION_ID_KEY, id);
        setSessionId(id);

        return id;
    }, []);

    const ensureSession = useCallback(
        async (title = "Đoạn chat mới") => {
            if (sessionId) return sessionId;
            if (creatingSessionPromiseRef.current) {
                return creatingSessionPromiseRef.current;
            }
            const p = createSession({ title }).finally(() => {
                creatingSessionPromiseRef.current = null;
            });
            creatingSessionPromiseRef.current = p;
            return p;
        },
        [sessionId, createSession]
    );

    const resetSession = useCallback(() => {
        abortStreaming();
        localStorage.removeItem(CHAT_SESSION_ID_KEY);
        setSessionId(null);
        setMessages([]);
    }, [abortStreaming]);

    const startNewChat = useCallback(async () => {
        if (isStreaming) abortStreaming();
        const sessions = await fetchChatSessions();
        const empty = sessions.find((s) => (s.message_count ?? 0) === 0);
        if (empty) {
            selectSession(empty.id);
            return;
        }
        await createSession({ title: "Đoạn chat mới" });
        setMessages([]);
        await fetchChatSessions();
    }, [isStreaming, abortStreaming, createSession, fetchChatSessions, selectSession]);

    // -------------------- Send Message (SSE) --------------------
    const sendMessage = useCallback(
        async (
            text: string,
            images?: { mimeType: string; data: string }[],
            options?: { model: string; reasoning_effort?: string | null }
        ) => {
            const hasImages = Boolean(images && images.length > 0);
            if (!hasImages && text.trim() === "") return;

            if (isStreaming) abortStreaming();

            setIsStreaming(true);

            let sid: string;
            try {
                sid = await ensureSession("Đoạn chat mới");
            } catch (e) {
                setIsStreaming(false);
                throw e;
            }

            const displayText = text;
            const attachmentUrls = hasImages
                ? images!.map((i) => `data:${i.mimeType};base64,${i.data}`)
                : undefined;

            const userMsg: ChatMessage = {
                id: uid("u"),
                role: "user",
                content: displayText,
                createdAt: new Date().toISOString(),
                kind: "text",
                attachmentUrls,
            };

            const assistantId = uid("a");
            const botMsg: ChatMessage = {
                id: assistantId,
                role: "assistant",
                content: "",
                createdAt: new Date().toISOString(),
                streaming: true,
                kind: "text",
            };

            setMessages((prev) => [...prev, userMsg, botMsg]);

            const ac = new AbortController();
            abortControllerRef.current = ac;

            const payload: {
                message: string;
                stream: boolean;
                images?: typeof images;
                model?: string;
                reasoning_effort?: string | null;
            } = {
                message: text,
                stream: true,
            };
            if (hasImages) payload.images = images;
            if (options?.model) payload.model = options.model;
            if (typeof options?.reasoning_effort === "string") {
                payload.reasoning_effort = options.reasoning_effort;
            }

            // ✅ uses refresh+retry if 401
            const res = await fetchWithRefreshRetry(`${API_BASE}/api/chat/sessions/${sid}/message`, {
                method: "POST",
                headers: authHeaders("text/event-stream"),
                body: JSON.stringify(payload),
                signal: ac.signal,
            });

            if (!res.ok) {
                const errText = await res.text().catch(() => "");
                setIsStreaming(false);
                abortControllerRef.current = null;

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? {
                                ...m,
                                streaming: false,
                                kind: "text",
                                content: `Error: ${errText || `Request failed (${res.status})`}`,
                            }
                            : m
                    )
                );
                return;
            }

            if (!res.body) {
                setIsStreaming(false);
                abortControllerRef.current = null;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, streaming: false, kind: "text", content: "No stream body." } : m
                    )
                );
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            let streamedImageUrl: string | undefined;
            let streamedImageId: string | undefined;

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    const lines = buffer.split(/\r?\n/);
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        const evt = parseSseJsonEvent(line);
                        if (evt && typeof evt === "object") {
                            if ((evt as any).type === "done" || (evt as any).done === true) continue;

                            if ((evt as any).type === "image") {
                                streamedImageUrl =
                                    typeof (evt as any).imageUrl === "string" ? (evt as any).imageUrl : streamedImageUrl;
                                streamedImageId =
                                    typeof (evt as any).imageId === "string" ? (evt as any).imageId : streamedImageId;

                                if (streamedImageUrl) {
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === assistantId
                                                ? {
                                                    ...m,
                                                    kind: "image",
                                                    imageUrl: streamedImageUrl,
                                                    imageId: streamedImageId,
                                                    content: m.content ?? "",
                                                }
                                                : m
                                        )
                                    );
                                }
                                continue;
                            }
                        }

                        const delta = parseSseTextDelta(line);
                        if (delta === null) continue;

                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId
                                    ? {
                                        ...m,
                                        content: (m.content ?? "") + delta,
                                    }
                                    : m
                            )
                        );
                    }
                }

                // flush leftover buffer lines
                const trailing = buffer.split(/\r?\n/);
                for (const line of trailing) {
                    const evt = parseSseJsonEvent(line);
                    if (evt && typeof evt === "object") {
                        if ((evt as any).type === "done" || (evt as any).done === true) continue;

                        if ((evt as any).type === "image") {
                            streamedImageUrl =
                                typeof (evt as any).imageUrl === "string" ? (evt as any).imageUrl : streamedImageUrl;
                            streamedImageId =
                                typeof (evt as any).imageId === "string" ? (evt as any).imageId : streamedImageId;
                            continue;
                        }
                    }

                    const delta = parseSseTextDelta(line);
                    if (delta === null) continue;

                    setMessages((prev) =>
                        prev.map((m) => (m.id === assistantId ? { ...m, content: (m.content ?? "") + delta } : m))
                    );
                }
            } catch (e: any) {
                if (e?.name === "AbortError") {
                    // user aborted; keep partial content
                } else {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? {
                                    ...m,
                                    content: (m.content || "") + `\n\n[Stream error]`,
                                    streaming: false,
                                    kind: m.kind ?? "text",
                                }
                                : m
                        )
                    );
                }
            } finally {
                setIsStreaming(false);
                abortControllerRef.current = null;

                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id !== assistantId) return m;

                        if (streamedImageUrl) {
                            return {
                                ...m,
                                streaming: false,
                                kind: "image",
                                imageUrl: streamedImageUrl,
                                imageId: streamedImageId,
                            };
                        }

                        return { ...m, streaming: false, kind: "text" };
                    })
                );
            }
        },
        [ensureSession, isStreaming, abortStreaming]
    );

    const value = useMemo<DataContextValue>(
        () => ({
            sessionId,
            messages,
            isStreaming,
            chatSessions,
            fetchChatSessions,
            selectSession,
            deleteSession,

            ensureSession,
            resetSession,
            sendMessage,
            abortStreaming,

            items,
            itemsLoading,
            itemsError,
            fetchItems,
            renewItem,
            startNewChat,
        }),
        [
            sessionId,
            messages,
            isStreaming,
            chatSessions,
            fetchChatSessions,
            selectSession,
            deleteSession,
            ensureSession,
            resetSession,
            sendMessage,
            abortStreaming,
            items,
            itemsLoading,
            itemsError,
            fetchItems,
            renewItem,
            startNewChat,
        ]
    );

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextValue => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used within DataProvider");
    return ctx;
};
