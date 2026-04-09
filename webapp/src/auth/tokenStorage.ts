/**
 * Lưu access/refresh token: localStorage + cookie (max-age) để reload vẫn còn phiên.
 * Cookie SameSite=Lax, path=/ — không HttpOnly (SPA cần đọc Authorization).
 */

const LS_ACCESS = "accessToken";
const LS_REFRESH = "refreshToken";

/** Tối thiểu 12 giờ (giây) cho access cookie */
export const ACCESS_COOKIE_MAX_AGE_SEC = 12 * 60 * 60; // 43200

/** Refresh thường dài hơn — khớp backend JWT_REFRESH_EXPIRES mặc định 7d */
export const REFRESH_COOKIE_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function setCookie(name: string, value: string, maxAgeSec: number): void {
    if (typeof document === "undefined") return;
    const secure = typeof window !== "undefined" && window.location?.protocol === "https:";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function deleteCookie(name: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const pref = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split("; ");
    for (const p of parts) {
        if (p.startsWith(pref)) {
            return decodeURIComponent(p.slice(pref.length));
        }
    }
    return null;
}

export function getStoredAccessToken(): string | null {
    return localStorage.getItem(LS_ACCESS) || getCookie(LS_ACCESS);
}

export function getStoredRefreshToken(): string | null {
    return localStorage.getItem(LS_REFRESH) || getCookie(LS_REFRESH);
}

export function setStoredTokens(accessToken: string | null, refreshToken: string | null): void {
    if (accessToken) {
        localStorage.setItem(LS_ACCESS, accessToken);
        setCookie(LS_ACCESS, accessToken, ACCESS_COOKIE_MAX_AGE_SEC);
    } else {
        localStorage.removeItem(LS_ACCESS);
        deleteCookie(LS_ACCESS);
    }
    if (refreshToken) {
        localStorage.setItem(LS_REFRESH, refreshToken);
        setCookie(LS_REFRESH, refreshToken, REFRESH_COOKIE_MAX_AGE_SEC);
    } else {
        localStorage.removeItem(LS_REFRESH);
        deleteCookie(LS_REFRESH);
    }
}

export function clearStoredTokens(): void {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    deleteCookie(LS_ACCESS);
    deleteCookie(LS_REFRESH);
}

type RefreshJson = { accessToken?: string; refreshToken?: string };

/**
 * Gọi POST /api/auth/refresh — dùng trước /me khi access hết hạn.
 */
export async function tryRefreshTokens(apiBase: string): Promise<boolean> {
    const rt = getStoredRefreshToken();
    if (!rt) return false;
    try {
        const res = await fetch(`${apiBase}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) return false;
        const json = (await res.json().catch(() => null)) as RefreshJson | null;
        if (!json?.accessToken || !json?.refreshToken) return false;
        setStoredTokens(json.accessToken, json.refreshToken);
        return true;
    } catch {
        return false;
    }
}
