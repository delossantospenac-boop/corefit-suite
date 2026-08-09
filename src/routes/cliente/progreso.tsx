import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Dumbbell, Flame, Percent, Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, ListSkeleton, PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDateTime } from "@/lib/fitcore";
import { formatWeight } from "@/lib/units";
import { prettyLabel, statusTone, streakDays } from "@/lib/rutinas";

export const Route = createFileRoute("/cliente/progreso")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mi progreso · FITCORE" },
      { property: "og:title", content: "Mi progreso · FITCORE" },
      { property: "og:description", content: "Sigue tu evolución de entrenamientos, peso corporal y récords." },
    ],
  }),
  component: MiProgreso,
});

function MiProgreso() {
  const { clientId, units } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-progreso", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [logs, appts, assessments, prs, routines] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("*")
          .eq("client_id", clientId!)
          .order("performed_at", { ascending: false }),
        supabase.from("appointments").select("id, status").eq("client_id", clientId!),
        supabase
          .from("assessments")
          .select("date, weight_kg")
          .eq("client_id", clientId!)
          .order("date", { ascending: true }),
        supabase
          .from("personal_records")
          .select("id, value, record_type, achieved_on, exercise_id, exercises(name)")
          .eq("client_id", clientId!)
          .order("achieved_on", { ascending: false }),
        supabase
          .from("workout_templates")
          .select("*")
          .eq("client_id", clientId!)
          .neq("status", "activa")
          .order("created_at", { ascending: false }),
      ]);
      return {
        logs: (logs.data ?? []).filter((l) => l.status === "completado"),
        appts: appts.data ?? [],
        assessments: assessments.data ?? [],
        prs: (prs.data ?? []) as any[],
        routines: routines.data ?? [],
      };
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

  const logs = data?.logs ?? [];
  const appts = data?.appts ?? [];
  const completedAppts = appts.filter((a) => a.status === "completada").length;
  const attendance = appts.length ? Math.round((completedAppts / appts.length) * 100) : 0;
  const streak = streakDays(logs.map((l) => l.performed_at));

  const weeklyVolume = groupByWeek(logs);
  const weight = (data?.assessments ?? []).map((a) => ({
    date: formatDate(a.date),
    peso: a.weight_kg ?? null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Mi progreso" subtitle="Tu evolución a lo largo del tiempo" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entrenamientos" value={logs.length} icon={Dumbbell} loading={isLoading} />
        <StatCard label="Clases realizadas" value={completedAppts} icon={CalendarCheck} loading={isLoading} />
        <StatCard label="Asistencia" value={`${attendance}%`} icon={Percent} loading={isLoading} />
        <StatCard label="Racha" value={`${streak} días`} icon={Flame} loading={isLoading} />
      </div>

      <SectionCard title="Volumen semanal">
        {weeklyVolume.length === 0 ? (
          <EmptyState title="Aún sin datos" description="Completa entrenamientos para ver tu progreso." />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="semana" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="volumen" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Peso corporal">
        {weight.length === 0 ? (
          <EmptyState title="Sin evaluaciones registradas" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={weight}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Récords personales">
        {(data?.prs ?? []).length === 0 ? (
          <EmptyState icon={Trophy} title="Aún sin récords" />
        ) : (
          <ul className="space-y-2">
            {(data?.prs ?? []).map((pr) => (
              <li key={pr.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Trophy className="h-4 w-4 shrink-0 text-neon" />
                  <span className="truncate">{pr.exercises?.name ?? "Ejercicio"}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatWeight(pr.value, units.weight)} · {formatDate(pr.achieved_on)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Historial de entrenamientos">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : logs.length === 0 ? (
          <EmptyState icon={Dumbbell} title="Sin entrenamientos completados" />
        ) : (
          <ul className="space-y-2">
            {logs.slice(0, 12).map((l) => (
              <li key={l.id} className="rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span>{formatDateTime(l.performed_at)}</span>
                  <span className="text-xs text-muted-foreground">{l.duration_min ?? 0} min</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.total_sets} series · {l.total_reps} reps · {Math.round(l.total_volume ?? 0)} kg volumen
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Rutinas anteriores">
        {(data?.routines ?? []).length === 0 ? (
          <EmptyState title="Sin rutinas anteriores" />
        ) : (
          <ul className="space-y-2">
            {(data?.routines ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{r.name}</span>
                <Badge variant="outline" className={statusTone[r.status]}>
                  {prettyLabel(r.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function groupByWeek(logs: { performed_at: string; total_volume: number | null }[]) {
  const map = new Map<string, number>();
  for (const l of logs) {
    const d = new Date(l.performed_at);
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    const key = monday.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + (l.total_volume ?? 0));
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([k, v]) => ({ semana: formatDate(k), volumen: Math.round(v) }));
}
