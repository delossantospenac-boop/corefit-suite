import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Check, Dumbbell, Play, Ticket, X } from "lucide-react";

import { EmptyState, ListSkeleton, PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/fitcore";
import { prettyLabel } from "@/lib/rutinas";
import { classPackage, classStatusTone, fetchClientClasses, nextClass, updateClass } from "@/lib/clases";

export const Route = createFileRoute("/cliente/clases")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mis clases · FITCORE" },
      { property: "og:title", content: "Mis clases · FITCORE" },
      { property: "og:description", content: "Consulta y confirma tus próximas clases con tu entrenador." },
    ],
  }),
  component: MisClases,
});

function MisClases() {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-clases", clientId],
    enabled: !!clientId,
    queryFn: () => fetchClientClasses(clientId!),
  });

  const { data: pkg } = useQuery({
    queryKey: ["cliente-clases-package", clientId],
    enabled: !!clientId,
    queryFn: () => classPackage(clientId!),
  });

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  const list = data ?? [];
  const now = Date.now();
  const upcoming = list.filter((a) => new Date(a.starts_at).getTime() >= now && a.status !== "cancelada");
  const past = list.filter((a) => new Date(a.starts_at).getTime() < now || a.status === "cancelada");
  const completed = past.filter((a) => a.status === "completada").length;
  const attendance = past.length ? Math.round((completed / past.length) * 100) : 0;
  const today = nextClass(list);

  async function updateStatus(id: string, status: "confirmada" | "cancelada") {
    try {
      await updateClass(id, { status });
      toast.success(status === "confirmada" ? "Asistencia confirmada" : "Clase cancelada");
      void queryClient.invalidateQueries({ queryKey: ["cliente-clases", clientId] });
    } catch {
      toast.error("No se pudo actualizar la clase");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Mis clases" subtitle="Tus sesiones con tu entrenador" />

      {today && (
        <SectionCard
          title="Entrenamiento de hoy"
          className="border-primary/40 bg-primary/5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-semibold">{today.title || prettyLabel(today.class_type)}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(today.starts_at)} · {today.duration_min} min</p>
              {today.workout_templates?.name && (
                <p className="flex items-center gap-1.5 text-sm">
                  <Dumbbell className="h-4 w-4 text-neon" /> Rutina: {today.workout_templates.name}
                  {today.workout_days?.name ? ` · ${today.workout_days.name}` : ""}
                </p>
              )}
              {today.plan_note && <p className="text-sm text-muted-foreground">Plan: {today.plan_note}</p>}
            </div>
            {today.day_id && (
              <Button
                size="lg"
                className="gap-2 sm:w-auto"
                onClick={() => void navigate({ to: "/cliente/entrenar/$dayId", params: { dayId: today.day_id! } })}
              >
                <Play className="h-4 w-4" /> Comenzar entrenamiento
              </Button>
            )}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Próximas" value={upcoming.length} icon={CalendarDays} loading={isLoading} />
        <StatCard label="Completadas" value={completed} icon={Check} loading={isLoading} />
        <StatCard label="Asistencia" value={`${attendance}%`} loading={isLoading} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Contratadas" value={pkg?.purchased ?? 0} icon={Ticket} />
        <StatCard label="Completadas" value={pkg?.completed ?? 0} />
        <StatCard label="Restantes" value={pkg?.remaining ?? 0} tone="success" />
      </div>

      <SectionCard title="Próximas clases">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No tienes clases programadas" />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-xl border border-border/70 bg-surface p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.title || prettyLabel(a.class_type)}</p>
                  <Badge variant="outline" className={classStatusTone[a.status]}>
                    {prettyLabel(a.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(a.starts_at)} · {a.duration_min} min
                </p>
                {a.workout_templates?.name && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Dumbbell className="h-3.5 w-3.5" /> {a.workout_templates.name}
                    {a.workout_days?.name ? ` · ${a.workout_days.name}` : ""}
                  </p>
                )}
                {a.plan_note && <p className="mt-1 text-xs text-muted-foreground">Plan: {a.plan_note}</p>}
                {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                <div className="mt-3 flex gap-2">
                  {a.status !== "confirmada" && (
                    <Button size="sm" className="flex-1 gap-1.5" onClick={() => updateStatus(a.id, "confirmada")}>
                      <Check className="h-3.5 w-3.5" /> Confirmar asistencia
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => updateStatus(a.id, "cancelada")}
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Historial">
        {past.length === 0 ? (
          <EmptyState title="Sin clases anteriores" />
        ) : (
          <ul className="space-y-2">
            {past.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{a.title || prettyLabel(a.class_type)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.starts_at)}</p>
                  {a.workout_templates?.name && (
                    <p className="truncate text-xs text-muted-foreground">{a.workout_templates.name}</p>
                  )}
                </div>
                <Badge variant="outline" className={classStatusTone[a.status]}>
                  {prettyLabel(a.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
