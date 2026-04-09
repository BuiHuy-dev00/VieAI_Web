// src/components/Auth/AuthContext.tsx
import {
    createContext,
    useContext,
    useLayoutEffect,
    useMemo,
    useCallback,
} from "react";
import type { FC, PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../hooks/useStore";
import { useMeQuery } from "../../hooks/useMeQuery.ts";
import {
    clearStoredTokens,
    getStoredAccessToken,
    getStoredRefreshToken,
    setStoredTokens,
} from "../../auth/tokenStorage.ts";

type RegisterBody = { email: string; password: string; name: string };
type LoginBody = { email: string; password: string };

type AuthSuccess = {
    user: any;
    tokens: { accessToken: string; refreshToken: string };
};

type RefreshResponse = { accessToken: string; refreshToken: string };
type ApiErrorBody = { success?: false; error?: { message?: string }; message?: string };

function apiErrorMessage(json: unknown, fallback: string): string {
    if (json == null || typeof json !== "object") return fallback;
    const body = json as ApiErrorBody;
    return body.error?.message ?? body.message ?? fallback;
}

type AuthContextValue = {
    user: any;
    register: (body: RegisterBody) => Promise<void>;
    login: (body: LoginBody) => Promise<void>;
    logout: () => Promise<void>;

    // optional helpers you can use elsewhere if you want
    refresh: () => Promise<RefreshResponse>;
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const API_BASE = import.meta.env.VITE_APP_API_URL;

// ✅ shared refresh in-flight promise (prevents multiple refresh calls at once)
let refreshPromise: Promise<RefreshResponse> | null = null;

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
                const json = (await res.json().catch(() => null)) as RefreshResponse | ApiErrorBody | null;
                if (!res.ok) {
                    throw new Error(apiErrorMessage(json, `Không làm mới phiên đăng nhập (${res.status})`));
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

function getAccessToken(): string | null {
    return getStoredAccessToken();
}

export const AuthProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
    const queryClient = useQueryClient();
    const user = useStore((s) => s.user);
    const setUser = useStore((s) => s.setUser);
    const setAuthenticated = useStore((s) => s.setAuthenticated);

    // /me uses Bearer token (prefer localStorage token used by hook)
    const meQuery = useMeQuery();

    useLayoutEffect(() => {
        const userData: any = meQuery.data;
        if (userData === undefined) return;

        if (userData?.id) {
            setUser(userData);
            setAuthenticated(true);
            return;
        }

        if (userData?.success && userData?.data?.user) {
            setUser(userData.data.user);
            setAuthenticated(true);
            return;
        }

        setUser(null);
        setAuthenticated(false);
    }, [meQuery.data, setUser, setAuthenticated]);

    const refresh = useCallback(async () => {
        const tokens = await refreshTokensOrThrow();
        // keep /me in sync after refresh (optional, but nice)
        await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
        return tokens;
    }, [queryClient]);

    const authFetch = useCallback(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const headers = new Headers(init?.headers || {});
            headers.set("Accept", headers.get("Accept") ?? "application/json");
            if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");

            const token = getAccessToken();
            if (token) headers.set("Authorization", `Bearer ${token}`);

            const first = await fetch(input, { ...init, headers });

            if (first.status !== 401) return first;

            // retry once after refresh
            try {
                await refreshTokensOrThrow();

                const retryHeaders = new Headers(init?.headers || {});
                retryHeaders.set("Accept", retryHeaders.get("Accept") ?? "application/json");
                if (!retryHeaders.has("Content-Type") && init?.body) retryHeaders.set("Content-Type", "application/json");

                const newToken = getAccessToken();
                if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);

                return await fetch(input, { ...init, headers: retryHeaders });
            } catch (e) {
                // refresh failed => hard sign-out
                clearStoredTokens();
                setUser(null);
                setAuthenticated(false);
                await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
                throw e instanceof Error ? e : new Error("Session expired. Please login again.");
            }
        },
        [setUser, setAuthenticated, queryClient]
    );

    const register = useCallback(async ({ email, password, name }: RegisterBody) => {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
            const json = (await res.json().catch(() => null)) as any;
            throw new Error(json?.error?.message ?? `Register failed (${res.status})`);
        }
    }, []);

    const login = useCallback(
        async ({ email, password }: LoginBody) => {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const json = (await res.json().catch(() => null)) as AuthSuccess | ApiErrorBody | null;

            if (!res.ok) {
                throw new Error(apiErrorMessage(json, `Đăng nhập thất bại (${res.status})`));
            }

            const success = json as AuthSuccess;
            const accessToken = success.tokens?.accessToken ?? null;
            const refreshToken = success.tokens?.refreshToken ?? null;

            if (accessToken && refreshToken) setStoredTokens(accessToken, refreshToken);

            // refetch /me to confirm authorization
            await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
            await meQuery.refetch();
        },
        [queryClient, meQuery]
    );

    const logout = useCallback(async () => {
        const refreshToken = getStoredRefreshToken();

        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
        } finally {
            clearStoredTokens();
            setUser(null);
            setAuthenticated(false);
            await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
        }
    }, [setUser, setAuthenticated, queryClient]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            register,
            login,
            logout,
            refresh,
            authFetch,
        }),
        [user, register, login, logout, refresh, authFetch]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
