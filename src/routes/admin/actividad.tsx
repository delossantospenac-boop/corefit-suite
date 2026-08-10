import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  CreditCard,
  Dumbbell,
  UserPlus,
  Users,
  CalendarCheck,
} from "lucide-react";

import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currency, formatDateTime } from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/actividad")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Actividad — FITCORE Admin" },
      {
        name: "description",
        content: "Actividad reciente de la plataforma FITCORE: entrenamientos, clases, clientes, pagos y altas.",
      },
      { property: "og:title", content: "Actividad — FITCORE Admin" },
      {
        property: "og:description",
        content: "Actividad reciente de la plataforma FITCORE: entrenamientos, clases, clientes, pagos y altas.",
      },
    ],
  }),
  component: ActivityPage,
});

const RANGE_OPTIONS = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
];

function useActivityData(days: number) {
  return useQuery({
    queryKey: ["admin-activity", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const [workoutsRes, appointmentsRes, clientsRes, paymentsRes, rolesRes] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("id, performed_at, total_volume, total_sets, feeling, client_id, clients(full_name, trainer_id)")
          .gte("performed_at", since)
          .order("performed_at", { ascending: false })
          .limit(20),
        supabase
          .from("appointments")
          .select("id, starts_at, title, status, class_type, client_id, trainer_id, clients(full_name)")
          .gte("starts_at", since)
          .order("starts_at", { ascending: false })
          .limit(20),
        supabase
          .from("clients")
          .select("id, full_name, created_at, trainer_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("membership_payments")
          .select("id, amount, currency, status, paid_at, created_at, billing_cycle, trainer_id, profiles(full_name, email)")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("user_roles")
          .select("user_id, role, created_at")
          .in("role", ["trainer", "gym_admin"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const trainerIds = (rolesRes.data ?? []).map((r) => r.user_id);
      let trainerProfiles: { id: string; full_name: string; email: string | null }[] = [];
      if (trainerIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", trainerIds);
        trainerProfiles = data ?? [];
      }
      const trainerProfileMap = new Map(trainerProfiles.map((p) => [p.id, p]));

      return {
        workouts: (workoutsRes.data ?? []) as any[],
        appointments: (appointmentsRes.data ?? []) as any[],
        clients: (clientsRes.data ?? []) as any[],
        payments: (paymentsRes.data ?? []) as any[],
        newTrainers: (rolesRes.data ?? []).map((r) => ({
          ...r,
          profile: trainerProfileMap.get(r.user_id),
        })),
      };
    },
  });
}

function ActivityPage() {
  const [range, setRange] = useState("30");
  const days = Number(range);
  const { data, isLoading } = useActivityData(days);

  const metrics = useMemo(
    () => ({
      workouts: data?.workouts.length ?? 0,
      appointments: data?.appointments.length ?? 0,
      clients: data?.clients.length ?? 0,
      payments: data?.payments.length ?? 0,
      newTrainers: data?.newTrainers.length ?? 0,
      revenue: (data?.payments ?? []).reduce((acc, p) => acc + (p.status === "activo" ? Number(p.amount ?? 0) : 0), 0),
    }),
    [data],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Actividad de la plataforma"
        subtitle="Vista en tiempo real de lo que ocurre en FITCORE"
        action={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Entrenamientos" value={metrics.workouts} icon={Dumbbell} loading={isLoading} />
        <StatCard label="Clases" value={metrics.appointments} icon={CalendarCheck} loading={isLoading} />
        <StatCard label="Clientes nuevos" value={metrics.clients} icon={Users} loading={isLoading} />
        <StatCard label="Pagos" value={metrics.payments} icon={CreditCard} loading={isLoading} />
        <StatCard label="Entrenadores nuevos" value={metrics.newTrainers} icon={UserPlus} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivitySection
          title="Últimos entrenamientos"
          icon={Dumbbell}
          isLoading={isLoading}
          items={data?.workouts ?? []}
          empty="Sin entrenamientos registrados en el rango."
          render={(w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{w.clients?.full_name ?? "Cliente"}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(w.performed_at)}</p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">{w.total_sets} series</p>
            </div>
          )}
        />

        <ActivitySection
          title="Últimas clases"
          icon={CalendarCheck}
          isLoading={isLoading}
          items={data?.appointments ?? []}
          empty="Sin clases registradas en el rango."
          render={(a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title || a.class_type || "Clase"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.clients?.full_name ?? "Cliente"} · {formatDateTime(a.starts_at)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                {a.status}
              </Badge>
            </div>
          )}
        />

        <ActivitySection
          title="Últimos clientes"
          icon={Users}
          isLoading={isLoading}
          items={data?.clients ?? []}
          empty="Sin clientes nuevos en el rango."
          render={(c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
              <p className="truncate text-sm font-medium">{c.full_name}</p>
              <p className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.created_at)}</p>
            </div>
          )}
        />

        <ActivitySection
          title="Últimos pagos de membresía"
          icon={CreditCard}
          isLoading={isLoading}
          items={data?.payments ?? []}
          empty="Sin pagos registrados en el rango."
          render={(p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.profiles?.full_name ?? p.profiles?.email ?? "Entrenador"}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(p.paid_at ?? p.created_at)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium">{currency(Number(p.amount ?? 0))}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] uppercase",
                    p.status === "activo"
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning",
                  )}
                >
                  {p.status}
                </Badge>
              </div>
            </div>
          )}
        />

        <ActivitySection
          title="Últimas altas de entrenadores"
          icon={UserPlus}
          isLoading={isLoading}
          items={data?.newTrainers ?? []}
          empty="Sin nuevas altas en el rango."
          render={(t) => (
            <div key={`${t.user_id}-${t.role}`} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.profile?.full_name ?? t.profile?.email ?? "Entrenador"}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                {t.role}
              </Badge>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function ActivitySection<T>({
  title,
  icon: Icon,
  items,
  isLoading,
  empty,
  render,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: T[];
  isLoading: boolean;
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} title="Sin datos" description={empty} />
      ) : (
        <div>{items.map((item) => render(item))}</div>
      )}
    </div>
  );
}
