import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { EmptyState, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cliente/logros")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Logros · FITCORE" },
      { property: "og:title", content: "Logros · FITCORE" },
      { property: "og:description", content: "Descubre los logros que has conseguido y los que te faltan." },
    ],
  }),
  component: Logros,
});

function Logros() {
  const { clientId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-logros", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [{ data: all }, { data: earned }] = await Promise.all([
        supabase.from("achievements").select("*").order("threshold", { ascending: true }),
        supabase.from("client_achievements").select("*").eq("client_id", clientId!),
      ]);
      return { all: all ?? [], earned: earned ?? [] };
    },
  });

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  const all = data?.all ?? [];
  const earnedMap = new Map((data?.earned ?? []).map((e) => [e.achievement_id, e.earned_at]));
  const unlocked = all.filter((a) => earnedMap.has(a.id));
  const locked = all.filter((a) => !earnedMap.has(a.id));

  return (
    <div className="space-y-5">
      <PageHeader title="Logros" subtitle={`${unlocked.length} de ${all.length} conseguidos`} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : all.length === 0 ? (
        <EmptyState icon={Trophy} title="Aún no hay logros disponibles" />
      ) : (
        <>
          <SectionCard title="Conseguidos">
            {unlocked.length === 0 ? (
              <EmptyState title="Todavía no has desbloqueado logros" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {unlocked.map((a) => (
                  <AchievementCard
                    key={a.id}
                    achievement={a}
                    {...(earnedMap.get(a.id) ? { earnedAt: earnedMap.get(a.id)! } : {})}
                  />

                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="Pendientes">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {locked.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function AchievementCard({
  achievement,
  earnedAt,
}: {
  achievement: { id: string; icon: string; name: string; description: string | null };
  earnedAt?: string;
}) {
  const unlocked = !!earnedAt;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border p-3.5 text-center",
        unlocked ? "border-primary/40 bg-primary/10" : "border-border/70 bg-surface opacity-60",
      )}
    >
      <span className="text-3xl">{achievement.icon || "🏆"}</span>
      <p className="text-xs font-semibold">{achievement.name}</p>
      {achievement.description && (
        <p className="text-[11px] text-muted-foreground">{achievement.description}</p>
      )}
      {unlocked && <p className="mt-1 text-[10px] text-neon">{formatDate(earnedAt)}</p>}
    </div>
  );
}
