import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.tsx";
import { useMeQuery } from "../../hooks/useMeQuery";

/**
 * Chỉ cho phép user có is_admin (theo /api/auth/me).
 * Chờ /me xong để tránh nhầm user?.is_admin khi store chưa sync.
 */
export default function AdminRoute() {
    const { user } = useAuth();
    const { isPending, data } = useMeQuery();
    const location = useLocation();

    if (isPending) {
        return null;
    }

    const fromMe =
        data && typeof data === "object" && "is_admin" in data
            ? Boolean((data as { is_admin?: boolean }).is_admin)
            : false;

    if (user?.is_admin || fromMe) {
        return <Outlet />;
    }

    return <Navigate to="/" replace state={{ from: location }} />;
}
