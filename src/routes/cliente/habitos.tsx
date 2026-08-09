import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Flame } from "lucide-react";

import { EmptyState, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { streakDays } from "@/lib/rutinas";

export const Route = createFileRoute("/cliente/habitos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hábitos · FITCORE" },
      { property: "og:title", content: "Hábitos · FITCORE" },
      { property: "og:description", content: "Marca tus hábitos diarios y sigue tu constancia." },
    ],
  }),
  component: Habitos,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Habitos() {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-habitos", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [{ data: habits }, { data: logs }] = await Promise.all([
        supabase.from("habits").select("*").eq("client_id", clientId!).eq("active", true).order("created_at"),
        supabase
          .from("habit_logs")
          .select("*")
          .eq("client_id", clientId!)
          .order("date", { ascending: false })
          .limit(400),
      ]);
      return { habits: habits ?? [], logs: logs ?? [] };
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

  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];

  async function toggleToday(habitId: string) {
    const today = todayISO();
    const existing = logs.find((l) => l.habit_id === habitId && l.date === today);
    if (existing) {
      const { error } = await supabase
        .from("habit_logs")
        .update({ completed: !existing.completed })
        .eq("id", existing.id);
      if (error) {
        toast.error("No se pudo actualizar el hábito");
        return;
      }
    } else {
      const { error } = await supabase
        .from("habit_logs")
        .insert({ client_id: clientId!, habit_id: habitId, date: today, completed: true });
      if (error) {
        toast.error("No se pudo registrar el hábito");
        return;
      }
    }
    toast.success("Hábito actualizado");
    void queryClient.invalidateQueries({ queryKey: ["cliente-habitos", clientId] });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Hábitos" subtitle="Tu constancia diaria" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : habits.length === 0 ? (
        <EmptyState icon={Flame} title="Aún no tienes hábitos asignados" />
      ) : (
        habits.map((h) => (
          <HabitCard key={h.id} habit={h} logs={logs.filter((l) => l.habit_id === h.id)} onToggle={() => toggleToday(h.id)} />
        ))
      )}
    </div>
  );
}

function HabitCard({
  habit,
  logs,
  onToggle,
}: {
  habit: { id: string; name: string; icon: string; unit: string | null; target: number | null };
  logs: { date: string; completed: boolean }[];
  onToggle: () => void;
}) {
  const today = todayISO();
  const todayLog = logs.find((l) => l.date === today);
  const streak = streakDays(logs.filter((l) => l.completed).map((l) => l.date));

  const weekCompliance = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      if (logs.some((l) => l.date === key && l.completed)) count += 1;
    }
    return Math.round((count / 7) * 100);
  }, [logs]);

  return (
    <SectionCard title={`${habit.icon} ${habit.name}`} subtitle={`Racha: ${streak} días`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Cumplimiento semanal</p>
          <Progress value={weekCompliance} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            todayLog?.completed ? "border-success bg-success/20 text-success" : "border-border text-muted-foreground"
          }`}
          aria-label="Marcar hábito de hoy"
        >
          {todayLog?.completed ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
        </button>
      </div>
    </SectionCard>
  );
}
