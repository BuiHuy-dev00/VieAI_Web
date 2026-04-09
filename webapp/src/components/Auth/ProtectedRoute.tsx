import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useMeQuery } from "../../hooks/useMeQuery";

function hasMeUser(data: unknown): boolean {
    if (!data || typeof data !== "object") return false;
    const o = data as Record<string, unknown>;
    if (typeof o.id === "number") return true;
    if (
        o.success === true &&
        o.data &&
        typeof o.data === "object" &&
        o.data !== null &&
        "user" in o.data &&
        (o.data as { user?: unknown }).user
    ) {
        return true;
    }
    return false;
}

/**
 * Phiên đăng nhập lấy từ /api/auth/me (và làm mới token trước đó trong useMeQuery).
 * Không dùng mỗi `authenticated` trong Zustand — tránh race: /me đã OK nhưng effect
 * cập nhật store chưa chạy → bị đá ra /login (kể cả admin).
 */
export default function ProtectedRoute() {
    const location = useLocation();
    const { isPending, isError, data } = useMeQuery();

    if (isPending) {
        return null;
    }

    if (isError || !hasMeUser(data)) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}
