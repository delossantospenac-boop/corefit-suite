import { useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Logo } from "@/components/fitcore/logo";
import { homeForRole, useAuth, type AppRole } from "@/lib/auth-context";

export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { loading, session, role } = useAuth();
  const router = useRouter();

  const allowed = role !== null && allow.includes(role);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void router.navigate({ to: "/auth", replace: true });
      return;
    }
    if (role && !allowed) {
      void router.navigate({ to: homeForRole(role), replace: true });
    }
  }, [loading, session, role, allowed, router]);

  if (loading || !session || !allowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background bg-hero px-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">Verificando tu acceso…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
