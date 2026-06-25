import { Navigate } from "react-router-dom";
import { useAuth } from "../providers";
import { isPlatformAdmin } from "../utils/roles";

export default function AdminRoute({ children }: { readonly children: React.ReactNode }) {
  const { authState } = useAuth();

  if (authState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!authState.isAuthenticated || !isPlatformAdmin(authState.user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
