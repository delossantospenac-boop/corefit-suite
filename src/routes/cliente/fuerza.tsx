import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, ListSkeleton, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/fitcore";
import { estimate1RM } from "@/lib/rutinas";
import { formatWeight, kgToDisplay } from "@/lib/units";

export const Route = createFileRoute("/cliente/fuerza")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mi fuerza · FITCORE" },
      { property: "og:title", content: "Mi fuerza · FITCORE" },
      { property: "og:description", content: "Consulta tus récords personales y la evolución de tu 1RM estimado." },
    ],
  }),
  component: MiFuerza,
});

function MiFuerza() {
  const { clientId, units } = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ["cliente-fuerza-prs", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_records")
        .select("id, value, weight, reps, record_type, achieved_on, exercise_id, exercises(id, name)")
        .eq("client_id", clientId!)
        .order("achieved_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const exercises = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records ?? []) {
      if (r.exercise_id && r.exercises?.name) map.set(r.exercise_id, r.exercises.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [records]);

  const activeExercise = selectedExercise ?? exercises[0]?.id ?? null;

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["cliente-fuerza-history", clientId, activeExercise],
    enabled: !!clientId && !!activeExercise,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_log_sets")
        .select("weight, reps, created_at")
        .eq("client_id", clientId!)
        .eq("exercise_id", activeExercise!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const chartData = (history ?? [])
    .filter((s) => s.weight && s.reps)
    .map((s) => ({
      fecha: formatDate(s.created_at),
      oneRm: kgToDisplay(estimate1RM(s.weight!, s.reps!), units.weight),
    }));

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
      <PageHeader title="Mi fuerza" subtitle="Tus récords personales y evolución de fuerza" />

      <SectionCard
        title="Evolución del 1RM"
        subtitle={exercises.length ? "Selecciona un ejercicio" : undefined}
        action={
          exercises.length > 0 ? (
            <Select value={activeExercise ?? undefined} onValueChange={setSelectedExercise}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Ejercicio" /></SelectTrigger>
              <SelectContent>
                {exercises.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      >
        {!activeExercise ? (
          <EmptyState title="Aún sin datos" description="Registra series de entrenamientos para ver tu evolución." />
        ) : loadingHistory ? (
          <ListSkeleton rows={3} />
        ) : chartData.length === 0 ? (
          <EmptyState title="Sin series registradas para este ejercicio" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="fecha" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="oneRm" name="1RM estimado" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Récords personales">
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : (records ?? []).length === 0 ? (
          <EmptyState icon={Trophy} title="Aún sin récords" description="Tus récords aparecerán cuando registres entrenamientos." />
        ) : (
          <ul className="space-y-2">
            {(records ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Trophy className="h-4 w-4 shrink-0 text-neon" />
                  <span className="min-w-0 truncate">{r.exercises?.name ?? "Ejercicio"}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground">1RM: {formatWeight(r.value, units.weight)}</span>
                  {r.weight && r.reps ? (
                    <span>{formatWeight(r.weight, units.weight)} × {r.reps} reps · </span>
                  ) : null}
                  {formatDate(r.achieved_on)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
