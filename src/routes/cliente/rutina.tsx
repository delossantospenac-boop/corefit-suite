import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Dumbbell, Play } from "lucide-react";

import { EmptyState, ListSkeleton, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { formatWeight } from "@/lib/units";
import {
  fetchClientRoutines,
  fetchRoutine,
  prettyLabel,
  statusTone,
  type FullRoutine,
} from "@/lib/rutinas";

export const Route = createFileRoute("/cliente/rutina")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mi rutina · FITCORE" },
      { property: "og:title", content: "Mi rutina · FITCORE" },
      {
        property: "og:description",
        content: "Consulta tu rutina activa y comienza tus entrenamientos del día.",
      },
    ],
  }),
  component: MiRutina,
});

function MiRutina() {
  const { clientId, units } = useAuth();

  const { data: routines, isLoading } = useQuery({
    queryKey: ["cliente-rutinas", clientId],
    enabled: !!clientId,
    queryFn: () => fetchClientRoutines(clientId!),
  });

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes para ver tu rutina."
      />
    );
  }

  const active = (routines ?? []).find((r) => r.status === "activa");
  const others = (routines ?? []).filter((r) => r.id !== active?.id);

  return (
    <div className="space-y-5">
      <PageHeader title="Mi rutina" subtitle="Tu plan de entrenamiento asignado" />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !active ? (
        <EmptyState
          icon={Dumbbell}
          title="No tienes una rutina activa"
          description="Tu entrenador aún no te ha asignado un plan de entrenamiento activo."
        />
      ) : (
        <ActiveRoutine routineId={active.id} units={units} />
      )}

      {others.length > 0 && (
        <SectionCard title="Rutinas anteriores" subtitle="Finalizadas, pausadas o archivadas">
          <ul className="space-y-2">
            {others.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {prettyLabel(r.goal)} · {r.weeks} semanas
                  </p>
                </div>
                <Badge variant="outline" className={statusTone[r.status]}>
                  {prettyLabel(r.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function ActiveRoutine({ routineId, units }: { routineId: string; units: { weight: "kg" | "lb" } }) {
  const { data: routine, isLoading } = useQuery({
    queryKey: ["cliente-rutina-detalle", routineId],
    queryFn: () => fetchRoutine(routineId),
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  if (!routine) return null;

  return (
    <SectionCard
      title={routine.name}
      subtitle={`${prettyLabel(routine.goal)} · ${prettyLabel(routine.level)} · ${routine.weeks} semanas`}
      action={
        <Badge variant="outline" className={statusTone[routine.status]}>
          {prettyLabel(routine.status)}
        </Badge>
      }
    >
      {routine.description && (
        <p className="mb-4 text-sm text-muted-foreground">{routine.description}</p>
      )}
      <div className="space-y-3">
        {routine.days.map((day) => (
          <DayCard key={day.id} day={day} routine={routine} units={units} />
        ))}
      </div>
    </SectionCard>
  );
}

function DayCard({
  day,
  units,
}: {
  day: FullRoutine["days"][number];
  routine: FullRoutine;
  units: { weight: "kg" | "lb" };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-3.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{day.name}</p>
          <p className="text-xs text-muted-foreground">
            {day.exercises.length} ejercicios
            {day.estimated_min ? ` · ~${day.estimated_min} min` : ""}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {day.exercises.map((ex) => (
            <li key={ex.id} className="rounded-lg bg-background/40 px-3 py-2 text-sm">
              <p className="font-medium">{ex.exercise?.name ?? "Ejercicio"}</p>
              <p className="text-xs text-muted-foreground">
                {(ex.plannedSets.length || ex.sets)}× series
                {ex.reps ? ` · ${ex.reps} reps` : ""}
                {ex.weight ? ` · ${formatWeight(ex.weight, units.weight)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Button asChild size="lg" className="mt-3.5 w-full gap-2">
        <Link to="/cliente/entrenar/$dayId" params={{ dayId: day.id }}>
          <Play className="h-4 w-4" /> Comenzar entrenamiento
        </Link>
      </Button>
    </div>
  );
}
