import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { Logo } from "@/components/fitcore/logo";
import { homeForRole, useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FITCORE — Centro de operaciones para entrenadores" },
      {
        name: "description",
        content:
          "Gestiona clientes, rutinas, progreso, nutrición, check-ins y pagos desde una sola plataforma premium.",
      },
      { property: "og:title", content: "FITCORE — Centro de operaciones para entrenadores" },
      {
        property: "og:description",
        content: "Clientes, rutinas, progreso, nutrición y pagos en una sola plataforma.",
      },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const { loading, session, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void router.navigate({ to: "/auth", replace: true });
      return;
    }
    void router.navigate({ to: homeForRole(role), replace: true });
  }, [loading, session, role, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-background bg-hero px-6">
      <div className="flex flex-col items-center gap-4">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">Cargando tu espacio…</p>
      </div>
    </div>
  );
}
