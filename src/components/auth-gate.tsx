import { useEffect, ReactNode } from "react";
import { useNavigate } ;
import { useAuth } from "@/lib/auth";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = useLocation().pathname;
  const nav = useNavigate();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) nav("/login");
  }, [user, loading, isPublic, nav]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full gradient-primary" />
      </div>
    );
  }

  if (!user && !isPublic) return null;

  return <>{children}</>;
}
