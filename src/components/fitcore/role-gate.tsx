import { useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ShieldAlert, LogOut } from "lucide-react";

import { Logo } from "@/components/fitcore/logo";
import { Button } from "@/components/ui/button";
import { accessBlockReason, homeForRole, useAuth, type AppRole } from "@/lib/auth-context";

function AccessBlocked({ reason }: { reason: string }) {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="grid min-h-screen place-items-center bg-background bg-hero px-6">
      <div className="card-surface w-full max-w-md p-6 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-destructive/15 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <Logo size="sm" />
        <h1 className="mt-4 text-lg font-semibold">Acceso bloqueado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
        <Button
          variant="outline"
          className="mt-6 w-full gap-2"
          onClick={async () => {
            await signOut();
            void router.navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { loading, session, role, profile, subscriptionStatus } = useAuth();
  const router = useRouter();

  const allowed = role !== null && allow.includes(role);
  const blockReason = accessBlockReason(role, profile, subscriptionStatus);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void router.navigate({ to: "/auth", replace: true });
      return;
    }
    if (role && !allowed && !blockReason) {
      void router.navigate({ to: homeForRole(role), replace: true });
    }
  }, [loading, session, role, allowed, blockReason, router]);

  if (!loading && session && role && blockReason) {
    return <AccessBlocked reason={blockReason} />;
  }

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
