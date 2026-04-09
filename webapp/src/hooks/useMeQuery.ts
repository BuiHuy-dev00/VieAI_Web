import { useQuery } from "@tanstack/react-query";
import {
    getStoredAccessToken,
    tryRefreshTokens,
} from "../auth/tokenStorage.ts";

type ApiMeWrapper = {
    success: boolean;
    data?: { user?: unknown | null; token?: string | null };
    error?: { message?: string };
};

/** /api/auth/me trả UserPublic trực tiếp (tsoa), hoặc wrapper legacy */
type MeResult = (Record<string, unknown> & { id?: number }) | ApiMeWrapper;

const API_BASE = (import.meta.env.VITE_APP_API_URL as string) || "";

function normalizeMeJson(res: Response, json: unknown): MeResult | null {
    if (res.status === 401) {
        return { success: false, data: { user: null, token: null } };
    }
    if (!res.ok) {
        return { success: false, data: { user: null, token: null } };
    }
    if (json && typeof json === "object" && "id" in json && typeof (json as { id: unknown }).id === "number") {
        return json as MeResult;
    }
    const w = json as ApiMeWrapper;
    if (w?.success && w?.data?.user) {
        return w;
    }
    return { success: false, data: { user: null, token: null } };
}

export const useMeQuery = () => {
    return useQuery({
        queryKey: ["auth.me"],
        queryFn: async (): Promise<MeResult> => {
            if (!API_BASE) {
                return { success: false, data: { user: null, token: null } };
            }
            let access = getStoredAccessToken();
            if (!access) {
                await tryRefreshTokens(API_BASE);
                access = getStoredAccessToken();
            }

            const fetchMe = async (token: string | null) => {
                return fetch(`${API_BASE}/api/auth/me`, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
            };

            let res = await fetchMe(access);
            let json: unknown = await res.json().catch(() => null);

            if (res.status === 401) {
                const refreshed = await tryRefreshTokens(API_BASE);
                if (refreshed) {
                    access = getStoredAccessToken();
                    res = await fetchMe(access);
                    json = await res.json().catch(() => null);
                }
            }

            return normalizeMeJson(res, json) ?? { success: false, data: { user: null, token: null } };
        },
        staleTime: Infinity,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        retry: false,
    });
};
