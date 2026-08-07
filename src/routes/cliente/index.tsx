import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Percent, Trophy, Weight } from "lucide-react";

import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, startOfWeekISO } from "@/lib/fitcore";

export const Route = createFileRoute("/cliente/")({
  ssr: false,
  component: ClientHome,
});

function ClientHome() {
  const { profile, clientId } = useAuth();
  const firstName = (profile?.full_name || "").split(" ")[0] || "atleta";

  const { data, isLoading } = useQuery({
    queryKey: ["client-home", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [logs, prs, assessments] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("id, performed_at")
          .eq("client_id", clientId!)
          .order("performed_at", { ascending: false })
          .limit(20),
        supabase
          .from("personal_records")
          .select("id, value, record_type, achieved_on")
          .eq("client_id", clientId!)
          .order("achieved_on", { ascending: false })
          .limit(5),
        supabase
          .from("assessments")
          .select("weight_kg, body_fat_pct, date")
          .eq("client_id", clientId!)
          .order("date", { ascending: false })
          .limit(1),
      ]);
      return {
        logs: logs.data ?? [],
        prs: prs.data ?? [],
        last: assessments.data?.[0] ?? null,
      };
    },
  });

  const weekStart = startOfWeekISO();
  const weekLogs = (data?.logs ?? []).filter((l) => l.performed_at.slice(0, 10) >= weekStart).length;
  const adherence = Math.min(100, Math.round((weekLogs / 3) * 100));

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Hola, {firstName} <span aria-hidden>👋</span>
          </>
        }
        subtitle="Tu progreso de un vistazo"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Peso actual"
          value={data?.last?.weight_kg ? `${data.last.weight_kg} kg` : "—"}
          icon={Weight}
          loading={isLoading}
        />
        <StatCard
          label="Grasa corporal"
          value={data?.last?.body_fat_pct ? `${data.last.body_fat_pct}%` : "—"}
          icon={Percent}
          loading={isLoading}
        />
        <StatCard
          label="Entrenamientos"
          value={data?.logs.length ?? 0}
          icon={Dumbbell}
          loading={isLoading}
        />
        <StatCard
          label="Adherencia semanal"
          value={`${adherence}%`}
          icon={Percent}
          tone={adherence >= 70 ? "success" : "warning"}
          loading={isLoading}
        />
      </div>

      <SectionCard title="Últimos logros">
        {(data?.prs ?? []).length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Aún sin récords"
            description="Registra tus entrenamientos para conseguir tus primeros récords."
          />
        ) : (
          <ul className="space-y-2">
            {(data?.prs ?? []).map((pr) => (
              <li
                key={pr.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
              >
                <Trophy className="h-4 w-4 shrink-0 text-neon" />
                <span className="min-w-0 flex-1 truncate">
                  Nuevo récord · {pr.record_type.toUpperCase()}
                </span>
                <span className="shrink-0 font-semibold text-neon">{pr.value} kg</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Actividad reciente">
        {(data?.logs ?? []).length === 0 ? (
          <EmptyState icon={Dumbbell} title="Sin entrenamientos registrados" />
        ) : (
          <ul className="space-y-2">
            {(data?.logs ?? []).slice(0, 6).map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
              >
                <Dumbbell className="h-4 w-4 shrink-0 text-neon" />
                <span className="min-w-0 flex-1 truncate">Entrenamiento completado</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(l.performed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
