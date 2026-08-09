import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Pause,
  Play,
  Plus,
  Timer,
  Trophy,
} from "lucide-react";

import { EmptyState, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatWeight, displayToKg, kgToDisplay } from "@/lib/units";
import {
  detectRecord,
  exerciseHistory,
  fetchRoutine,
  finishSession,
  logSet,
  notify,
  startSession,
  volumeOf,
} from "@/lib/rutinas";

export const Route = createFileRoute("/cliente/entrenar/$dayId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrenar · FITCORE" },
      { property: "og:title", content: "Entrenar · FITCORE" },
      { property: "og:description", content: "Registra tu entrenamiento serie por serie en tiempo real." },
    ],
  }),
  component: Entrenar,
});

const FEELINGS = [
  { value: 1, emoji: "😫", label: "Muy difícil" },
  { value: 2, emoji: "😕", label: "Difícil" },
  { value: 3, emoji: "🙂", label: "Normal" },
  { value: 4, emoji: "🔥", label: "Excelente" },
];

function Entrenar() {
  const { dayId } = Route.useParams();
  const { clientId, units, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [exIndex, setExIndex] = useState(0);
  const [prsCount, setPrsCount] = useState(0);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [restPaused, setRestPaused] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const [finished, setFinished] = useState<null | { totalVolume: number; totalSets: number; totalReps: number }>(
    null,
  );
  const [feeling, setFeeling] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);

  // find template that owns this day
  const { data: template } = useQuery({
    queryKey: ["day-template", dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_days")
        .select("template_id")
        .eq("id", dayId)
        .single();
      if (error) throw error;
      return data.template_id as string;
    },
  });

  useEffect(() => {
    if (template) setTemplateId(template);
  }, [template]);

  const { data: routine, isLoading: loadingRoutine } = useQuery({
    queryKey: ["entrenar-rutina", templateId],
    enabled: !!templateId,
    queryFn: () => fetchRoutine(templateId!),
  });

  const day = useMemo(() => routine?.days.find((d) => d.id === dayId) ?? null, [routine, dayId]);

  const { data: session } = useQuery({
    queryKey: ["session", clientId, dayId, templateId],
    enabled: !!clientId && !!templateId,
    queryFn: () => startSession(clientId!, templateId!, dayId),
  });

  useEffect(() => {
    if (restLeft === null || restPaused) return;
    if (restLeft <= 0) {
      setRestLeft(null);
      return;
    }
    const t = setTimeout(() => setRestLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
  }, [restLeft, restPaused]);

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  if (loadingRoutine || !day || !session) {
    return <div className="p-6 text-sm text-muted-foreground">Preparando tu entrenamiento…</div>;
  }

  if (finished) {
    return (
      <ResumenFinal
        finished={finished}
        prsCount={prsCount}
        feeling={feeling}
        setFeeling={setFeeling}
        finishing={finishing}
        onConfirm={async () => {
          if (feeling === null) {
            toast.error("Selecciona cómo estuvo tu entrenamiento");
            return;
          }
          setFinishing(true);
          try {
            await finishSession({
              sessionId: session.id,
              logId: session.log_id!,
              clientId: clientId!,
              durationMin: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
              feeling,
              notes: null,
              prsCount,
            });
            const { data: client } = await supabase
              .from("clients")
              .select("trainer_id, full_name")
              .eq("id", clientId!)
              .maybeSingle();
            if (client?.trainer_id) {
              await notify({
                userId: client.trainer_id,
                title: "Entrenamiento completado",
                body: `${client.full_name ?? "Tu cliente"} completó "${day.name}"`,
                kind: "entrenamiento",
              });
            }
            void queryClient.invalidateQueries();
            toast.success("¡Entrenamiento guardado!");
            navigate({ to: "/cliente/rutina" });
          } catch {
            toast.error("No se pudo finalizar el entrenamiento");
          } finally {
            setFinishing(false);
          }
        }}
      />
    );
  }

  const exercises = day.exercises;
  const current = exercises[exIndex];

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title={day.name}
        subtitle={`Ejercicio ${exIndex + 1} de ${exercises.length}`}
      />

      {restLeft !== null && (
        <RestTimer
          seconds={restLeft}
          paused={restPaused}
          onPause={() => setRestPaused((p) => !p)}
          onSkip={() => setRestLeft(null)}
          onAdd15={() => setRestLeft((s) => (s ?? 0) + 15)}
        />
      )}

      {current && (
        <ExercisePanel
          key={current.id}
          clientId={clientId}
          logId={session.log_id!}
          exercise={current}
          units={units}
          onSetLogged={(restSeconds) => {
            setRestLeft(restSeconds ?? 60);
            setRestPaused(false);
          }}
          onPr={() => setPrsCount((c) => c + 1)}
        />
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          disabled={exIndex === 0}
          onClick={() => setExIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          disabled={exIndex >= exercises.length - 1}
          onClick={() => setExIndex((i) => Math.min(exercises.length - 1, i + 1))}
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        size="lg"
        className="w-full gap-2"
        onClick={async () => {
          const { data: sets } = await supabase
            .from("workout_log_sets")
            .select("id")
            .eq("log_id", session.log_id!);
          if (!sets || sets.length === 0) {
            toast.error("Registra al menos una serie antes de finalizar");
            return;
          }
          const { data: aggSets } = await supabase
            .from("workout_log_sets")
            .select("weight, reps")
            .eq("log_id", session.log_id!);
          const rows = aggSets ?? [];
          setFinished({
            totalVolume: volumeOf(rows),
            totalSets: rows.length,
            totalReps: rows.reduce((a, s) => a + (s.reps ?? 0), 0),
          });
        }}
      >
        <Check className="h-4 w-4" /> Finalizar entrenamiento
      </Button>
    </div>
  );
}

function RestTimer({
  seconds,
  paused,
  onPause,
  onSkip,
  onAdd15,
}: {
  seconds: number;
  paused: boolean;
  onPause: () => void;
  onSkip: () => void;
  onAdd15: () => void;
}) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div className="card-surface flex items-center justify-between gap-3 border-primary/40 bg-primary/10 p-4">
      <div className="flex items-center gap-3">
        <Timer className="h-6 w-6 text-neon" />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Descanso</p>
          <p className="text-2xl font-bold tabular-nums text-neon">
            {mm}:{ss.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="icon" variant="outline" onClick={onAdd15} aria-label="Añadir 15 segundos">
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onPause} aria-label="Pausar">
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="outline" onClick={onSkip}>
          Saltar
        </Button>
      </div>
    </div>
  );
}

function ExercisePanel({
  clientId,
  logId,
  exercise,
  units,
  onSetLogged,
  onPr,
}: {
  clientId: string;
  logId: string;
  exercise: NonNullable<ReturnType<typeof useQuery>["data"]> extends never ? any : any;
  units: { weight: "kg" | "lb" };
  onSetLogged: (restSeconds: number | null) => void;
  onPr: () => void;
}) {
  const plannedSets = exercise.plannedSets.length > 0 ? exercise.plannedSets : [
    { id: "default-1", set_number: 1, reps: exercise.reps, weight: exercise.weight, rest_seconds: exercise.rest_seconds },
  ];

  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["exercise-history", clientId, exercise.exercise_id],
    queryFn: () => exerciseHistory(clientId, exercise.exercise_id),
    enabled: historyOpen,
  });

  return (
    <SectionCard title={exercise.exercise?.name ?? "Ejercicio"} subtitle={exercise.exercise?.muscle_group ?? undefined}>
      {(exercise.notes || exercise.tips) && (
        <p className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
          {exercise.tips || exercise.notes}
        </p>
      )}

      <div className="space-y-3">
        {plannedSets.map((set: any, idx: number) => (
          <SetRow
            key={set.id}
            done={!!completedSets[set.id]}
            index={idx + 1}
            targetReps={set.reps}
            targetWeight={set.weight}
            units={units}
            onComplete={async (values) => {
              await logSet({
                logId,
                clientId,
                exerciseId: exercise.exercise_id,
                setNumber: idx + 1,
                weight: values.weight,
                reps: values.reps,
                rir: values.rir,
                rpe: values.rpe,
                notes: values.notes,
              });
              const pr = await detectRecord(clientId, exercise.exercise_id, values.weight, values.reps);
              if (pr.isPr) {
                onPr();
                toast.success(`🏆 ¡Nuevo récord personal! 1RM estimado: ${pr.value} kg`, { duration: 5000 });
              }
              setCompletedSets((s) => ({ ...s, [set.id]: true }));
              onSetLogged(set.rest_seconds ?? exercise.rest_seconds ?? 60);
            }}
          />
        ))}
      </div>

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <History className="h-4 w-4" /> Historial del ejercicio
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {(history ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin registros previos.</p>
          ) : (
            (history ?? []).slice(0, 8).map((h) => (
              <div key={h.id} className="flex justify-between rounded-lg bg-surface px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString("es")}
                </span>
                <span>
                  {formatWeight(h.weight, units.weight)} × {h.reps} reps
                </span>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>
    </SectionCard>
  );
}

function SetRow({
  index,
  targetReps,
  targetWeight,
  done,
  units,
  onComplete,
}: {
  index: number;
  targetReps: string | null;
  targetWeight: number | null;
  done: boolean;
  units: { weight: "kg" | "lb" };
  onComplete: (values: {
    weight: number | null;
    reps: number | null;
    rir: number | null;
    rpe: number | null;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [weight, setWeight] = useState(targetWeight ? String(kgToDisplay(targetWeight, units.weight)) : "");
  const [reps, setReps] = useState(targetReps ? targetReps.replace(/\D/g, "") : "");
  const [rir, setRir] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className={`rounded-xl border p-3 ${done ? "border-success/40 bg-success/10" : "border-border/70 bg-surface"}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">
          Serie {index}
          <span className="ml-2 text-xs text-muted-foreground">
            Objetivo: {targetWeight ? formatWeight(targetWeight, units.weight) : "—"}
            {targetReps ? ` × ${targetReps}` : ""}
          </span>
        </p>
        {done && <Badge className="gap-1 bg-success/20 text-success">Completada</Badge>}
      </div>
      {!done && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <Label className="text-[10px] text-muted-foreground">Peso ({units.weight})</Label>
            <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Reps</Label>
            <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">RIR</Label>
            <Input inputMode="numeric" value={rir} onChange={(e) => setRir(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">RPE</Label>
            <Input inputMode="numeric" value={rpe} onChange={(e) => setRpe(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <Label className="text-[10px] text-muted-foreground">Notas</Label>
            <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            className="col-span-2 gap-2 sm:col-span-4"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onComplete({
                  weight: displayToKg(weight ? Number(weight.replace(",", ".")) : null, units.weight),
                  reps: reps ? Number(reps) : null,
                  rir: rir ? Number(rir) : null,
                  rpe: rpe ? Number(rpe) : null,
                  notes: notes || null,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            <Check className="h-4 w-4" /> Completar serie
          </Button>
        </div>
      )}
    </div>
  );
}

function ResumenFinal({
  finished,
  prsCount,
  feeling,
  setFeeling,
  finishing,
  onConfirm,
}: {
  finished: { totalVolume: number; totalSets: number; totalReps: number };
  prsCount: number;
  feeling: number | null;
  setFeeling: (v: number) => void;
  finishing: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-5">
      <PageHeader title="¡Entrenamiento completado!" subtitle="Revisa tu resumen y guárdalo" />
      <SectionCard title="Resumen">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Series" value={finished.totalSets} />
          <Stat label="Repeticiones" value={finished.totalReps} />
          <Stat label="Volumen total" value={`${Math.round(finished.totalVolume)} kg`} />
          <Stat label="Récords" value={prsCount} icon={prsCount > 0} />
        </div>
      </SectionCard>
      <SectionCard title="¿Cómo estuvo tu entrenamiento?">
        <div className="grid grid-cols-4 gap-2">
          {FEELINGS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFeeling(f.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-colors ${
                feeling === f.value ? "border-primary bg-primary/10 text-neon" : "border-border/70 bg-surface"
              }`}
            >
              <span className="text-2xl">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </SectionCard>
      <Button size="lg" className="w-full gap-2" disabled={finishing} onClick={onConfirm}>
        <Check className="h-4 w-4" /> Guardar entrenamiento
      </Button>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-3 text-center">
      <p className="text-2xl font-semibold text-neon">
        {icon && Number(value) > 0 && <Trophy className="mr-1 inline h-5 w-5" />}
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
