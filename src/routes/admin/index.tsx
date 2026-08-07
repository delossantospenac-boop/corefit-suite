import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Sparkles, Users, UserCheck } from "lucide-react";

import { PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/fitcore";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profiles, roles, clients, subs, plans] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, active, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("clients").select("id, status"),
        supabase.from("trainer_subscriptions").select("id, status, price"),
        supabase.from("subscription_plans").select("*").order("sort_order"),
      ]);
      return {
        profiles: profiles.data ?? [],
        roles: roles.data ?? [],
        clients: clients.data ?? [],
        subs: subs.data ?? [],
        plans: plans.data ?? [],
      };
    },
  });

  const trainerIds = new Set(
    (data?.roles ?? []).filter((r) => r.role === "trainer").map((r) => r.user_id),
  );
  const trainers = (data?.profiles ?? []).filter((p) => trainerIds.has(p.id));
  const activeTrainers = trainers.filter((t) => t.active).length;
  const activeSubs = (data?.subs ?? []).filter((s) => s.status === "activo");
  const mrr = activeSubs.reduce((acc, s) => acc + Number(s.price ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Panel de administración" subtitle="Estado global de la plataforma" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Entrenadores" value={trainers.length} icon={Users} loading={isLoading} />
        <StatCard label="Activos" value={activeTrainers} icon={UserCheck} tone="success" loading={isLoading} />
        <StatCard
          label="Inactivos"
          value={trainers.length - activeTrainers}
          icon={Users}
          tone="muted"
          loading={isLoading}
        />
        <StatCard label="Clientes totales" value={data?.clients.length ?? 0} icon={Users} loading={isLoading} />
        <StatCard
          label="Membresías activas"
          value={activeSubs.length}
          icon={Sparkles}
          loading={isLoading}
        />
        <StatCard label="MRR" value={currency(mrr)} icon={CreditCard} loading={isLoading} />
      </div>

      <SectionCard title="Planes SaaS" subtitle="Estructura editable de precios y límites">
        <div className="grid gap-3 sm:grid-cols-3">
          {(data?.plans ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-border/70 bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold uppercase tracking-wide text-neon">{p.name}</p>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {p.active ? "activo" : "inactivo"}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>Clientes: {p.max_clients ?? "Ilimitados"}</li>
                <li>Entrenadores: {p.max_trainers}</li>
                <li>Almacenamiento: {p.storage_gb} GB</li>
                <li>Precio mensual: {p.monthly_price ? currency(Number(p.monthly_price)) : "Sin definir"}</li>
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Entrenadores registrados">
        <ul className="space-y-2">
          {trainers.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay entrenadores registrados.</p>
          )}
          {trainers.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.full_name || "Sin nombre"}</p>
                <p className="truncate text-xs text-muted-foreground">{t.email}</p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                {t.active ? "activo" : "inactivo"}
              </Badge>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
