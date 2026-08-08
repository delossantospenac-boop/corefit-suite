import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RoutineStatus = Database["public"]["Enums"]["routine_status"];
export type RoutineGoal = Database["public"]["Enums"]["routine_goal"];
export type RoutineLevel = Database["public"]["Enums"]["routine_level"];
export type SetType = Database["public"]["Enums"]["set_type"];

export type RoutineRow = Database["public"]["Tables"]["workout_templates"]["Row"];
export type DayRow = Database["public"]["Tables"]["workout_days"]["Row"];
export type RoutineExerciseRow = Database["public"]["Tables"]["workout_exercises"]["Row"];
export type PlannedSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];
export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
export type LogRow = Database["public"]["Tables"]["workout_logs"]["Row"];
export type LogSetRow = Database["public"]["Tables"]["workout_log_sets"]["Row"];

export type FullExercise = RoutineExerciseRow & {
  exercise: Pick<ExerciseRow, "id" | "name" | "muscle_group" | "equipment" | "video_url" | "image_url"> | null;
  sets: PlannedSetRow[];
};
export type FullDay = DayRow & { exercises: FullExercise[] };
export type FullRoutine = RoutineRow & { days: FullDay[] };

/* ------------------------------ catálogos ------------------------------ */

export const GOALS: { value: RoutineGoal; label: string }[] = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "perdida_grasa", label: "Pérdida de grasa" },
  { value: "fuerza", label: "Fuerza" },
  { value: "resistencia", label: "Resistencia" },
  { value: "recomposicion", label: "Recomposición" },
  { value: "acondicionamiento", label: "Acondicionamiento" },
  { value: "personalizado", label: "Personalizado" },
];

export const LEVELS: { value: RoutineLevel; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export const STATUSES: { value: RoutineStatus; label: string }[] = [
  { value: "activa", label: "Activa" },
  { value: "programada", label: "Programada" },
  { value: "finalizada", label: "Finalizada" },
  { value: "pausada", label: "Pausada" },
  { value: "archivada", label: "Archivada" },
];

export const SET_TYPES: { value: SetType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "calentamiento", label: "Calentamiento" },
  { value: "drop_set", label: "Drop set" },
  { value: "superserie", label: "Superserie" },
  { value: "triserie", label: "Triserie" },
  { value: "descendente", label: "Descendente" },
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "isometrico", label: "Isométrico" },
  { value: "circuito", label: "Circuito" },
];

export const MUSCLE_GROUPS = [
  "pecho",
  "espalda",
  "hombros",
  "biceps",
  "triceps",
  "cuadriceps",
  "femorales",
  "gluteos",
  "pantorrillas",
  "abdominales",
  "cardio",
  "cuerpo_completo",
  "movilidad",
] as const;

export const EQUIPMENT = [
  "barra",
  "mancuernas",
  "polea",
  "maquina",
  "banda",
  "peso_corporal",
  "kettlebell",
  "otros",
] as const;

export const DIFFICULTIES = ["principiante", "intermedio", "avanzado"] as const;

export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function prettyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const statusTone: Record<RoutineStatus, string> = {
  activa: "border-primary/40 bg-primary/10 text-neon",
  programada: "border-warning/40 bg-warning/10 text-warning",
  finalizada: "border-success/40 bg-success/10 text-success",
  pausada: "border-warning/40 bg-warning/10 text-warning",
  archivada: "border-border bg-muted text-muted-foreground",
};

/* ------------------------------ lecturas ------------------------------ */

export async function fetchRoutines(): Promise<RoutineRow[]> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoutine(id: string): Promise<FullRoutine | null> {
  const { data: routine, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!routine) return null;

  const { data: days, error: dErr } = await supabase
    .from("workout_days")
    .select("*")
    .eq("template_id", id)
    .order("day_index", { ascending: true });
  if (dErr) throw dErr;

  const dayIds = (days ?? []).map((d) => d.id);
  let exercises: RoutineExerciseRow[] = [];
  let sets: PlannedSetRow[] = [];
  let library: ExerciseRow[] = [];

  if (dayIds.length > 0) {
    const { data: ex, error: eErr } = await supabase
      .from("workout_exercises")
      .select("*")
      .in("day_id", dayIds)
      .order("position", { ascending: true });
    if (eErr) throw eErr;
    exercises = ex ?? [];

    const exIds = exercises.map((e) => e.id);
    if (exIds.length > 0) {
      const { data: st } = await supabase
        .from("workout_sets")
        .select("*")
        .in("workout_exercise_id", exIds)
        .order("set_number", { ascending: true });
      sets = st ?? [];
    }
    const libIds = [...new Set(exercises.map((e) => e.exercise_id).filter(Boolean))] as string[];
    if (libIds.length > 0) {
      const { data: lib } = await supabase.from("exercises").select("*").in("id", libIds);
      library = lib ?? [];
    }
  }

  return {
    ...routine,
    days: (days ?? []).map((d) => ({
      ...d,
      exercises: exercises
        .filter((e) => e.day_id === d.id)
        .map((e) => ({
          ...e,
          exercise: library.find((l) => l.id === e.exercise_id) ?? null,
          sets: sets.filter((s) => s.workout_exercise_id === e.id),
        })),
    })),
  };
}

export async function fetchExerciseLibrary(): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClientRoutines(clientId: string): Promise<RoutineRow[]> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_template", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------ escrituras ------------------------------ */

export type RoutineInput = {
  name: string;
  client_id: string | null;
  goal: RoutineGoal | null;
  level: RoutineLevel | null;
  status: RoutineStatus;
  start_date: string | null;
  end_date: string | null;
  days_per_week: number;
  suggested_time: string | null;
  weeks: number;
  description: string | null;
  notes: string | null;
  is_template: boolean;
};

export async function createRoutine(input: RoutineInput, trainerId: string): Promise<string> {
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ ...input, trainer_id: trainerId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateRoutine(id: string, patch: Partial<RoutineInput> & { archived?: boolean }) {
  const { error } = await supabase.from("workout_templates").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from("workout_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function addDay(templateId: string, dayIndex: number, name: string) {
  const { data, error } = await supabase
    .from("workout_days")
    .insert({ template_id: templateId, day_index: dayIndex, name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateDay(id: string, patch: Partial<DayRow>) {
  const { error } = await supabase.from("workout_days").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDay(id: string) {
  const { error } = await supabase.from("workout_days").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderDays(ids: string[]) {
  await Promise.all(
    ids.map((id, index) => supabase.from("workout_days").update({ day_index: index }).eq("id", id)),
  );
}

export async function addExerciseToDay(
  dayId: string,
  exerciseId: string,
  position: number,
): Promise<string> {
  const { data, error } = await supabase
    .from("workout_exercises")
    .insert({ day_id: dayId, exercise_id: exerciseId, position, sets: 3, reps: "10", rest_seconds: 90 })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("workout_sets").insert(
    Array.from({ length: 3 }).map((_, i) => ({
      workout_exercise_id: data.id,
      set_number: i + 1,
      reps: "10",
      rest_seconds: 90,
    })),
  );
  return data.id;
}

export async function updateRoutineExercise(id: string, patch: Partial<RoutineExerciseRow>) {
  const { error } = await supabase.from("workout_exercises").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutineExercise(id: string) {
  const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderExercises(ids: string[]) {
  await Promise.all(
    ids.map((id, index) =>
      supabase.from("workout_exercises").update({ position: index }).eq("id", id),
    ),
  );
}

export async function replacePlannedSets(
  workoutExerciseId: string,
  sets: Omit<PlannedSetRow, "id" | "created_at" | "workout_exercise_id">[],
) {
  await supabase.from("workout_sets").delete().eq("workout_exercise_id", workoutExerciseId);
  if (sets.length === 0) return;
  const { error } = await supabase
    .from("workout_sets")
    .insert(sets.map((s) => ({ ...s, workout_exercise_id: workoutExerciseId })));
  if (error) throw error;
}

/* --------------------------- duplicar / plantillas --------------------------- */

type DuplicateOptions = {
  name?: string;
  clientId?: string | null;
  asTemplate?: boolean;
  status?: RoutineStatus;
  phase?: number;
  parentRoutineId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function duplicateRoutine(
  sourceId: string,
  trainerId: string,
  options: DuplicateOptions = {},
): Promise<string> {
  const source = await fetchRoutine(sourceId);
  if (!source) throw new Error("Rutina no encontrada");

  const { data: created, error } = await supabase
    .from("workout_templates")
    .insert({
      trainer_id: trainerId,
      name: options.name ?? `${source.name} (copia)`,
      description: source.description,
      notes: source.notes,
      goal: source.goal,
      level: source.level,
      weeks: source.weeks,
      days_per_week: source.days_per_week,
      suggested_time: source.suggested_time,
      client_id: options.asTemplate ? null : (options.clientId ?? source.client_id),
      is_template: options.asTemplate ?? false,
      status: options.status ?? (options.asTemplate ? "activa" : "programada"),
      start_date: options.startDate ?? null,
      end_date: options.endDate ?? null,
      phase: options.phase ?? 1,
      parent_routine_id: options.parentRoutineId ?? null,
      source_template_id: source.is_template ? source.id : source.source_template_id,
    })
    .select("id")
    .single();
  if (error) throw error;

  for (const day of source.days) {
    const { data: newDay, error: dErr } = await supabase
      .from("workout_days")
      .insert({
        template_id: created.id,
        day_index: day.day_index,
        name: day.name,
        notes: day.notes,
        description: day.description,
        estimated_min: day.estimated_min,
        weekday: day.weekday,
      })
      .select("id")
      .single();
    if (dErr) throw dErr;

    for (const ex of day.exercises) {
      const { data: newEx, error: eErr } = await supabase
        .from("workout_exercises")
        .insert({
          day_id: newDay.id,
          exercise_id: ex.exercise_id,
          position: ex.position,
          block: ex.block,
          group_label: ex.group_label,
          set_type: ex.set_type,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          time_seconds: ex.time_seconds,
          distance_m: ex.distance_m,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rir: ex.rir,
          rpe: ex.rpe,
          notes: ex.notes,
          tips: ex.tips,
        })
        .select("id")
        .single();
      if (eErr) throw eErr;

      if (ex.sets.length > 0) {
        await supabase.from("workout_sets").insert(
          ex.sets.map((s) => ({
            workout_exercise_id: newEx.id,
            set_number: s.set_number,
            set_type: s.set_type,
            reps: s.reps,
            weight: s.weight,
            time_seconds: s.time_seconds,
            distance_m: s.distance_m,
            rest_seconds: s.rest_seconds,
            rir: s.rir,
            rpe: s.rpe,
            tempo: s.tempo,
            notes: s.notes,
          })),
        );
      }
    }
  }

  return created.id;
}

export async function duplicateDay(dayId: string) {
  const { data: day, error } = await supabase
    .from("workout_days")
    .select("*")
    .eq("id", dayId)
    .single();
  if (error) throw error;

  const { count } = await supabase
    .from("workout_days")
    .select("id", { count: "exact", head: true })
    .eq("template_id", day.template_id);

  const { data: newDay, error: nErr } = await supabase
    .from("workout_days")
    .insert({
      template_id: day.template_id,
      day_index: count ?? day.day_index + 1,
      name: `${day.name} (copia)`,
      notes: day.notes,
      description: day.description,
      estimated_min: day.estimated_min,
      weekday: day.weekday,
    })
    .select("id")
    .single();
  if (nErr) throw nErr;

  const { data: exercises } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("day_id", dayId)
    .order("position");

  for (const ex of exercises ?? []) {
    const { data: newEx } = await supabase
      .from("workout_exercises")
      .insert({ ...stripIds(ex), day_id: newDay.id })
      .select("id")
      .single();
    if (!newEx) continue;
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("*")
      .eq("workout_exercise_id", ex.id);
    if (sets && sets.length > 0) {
      await supabase
        .from("workout_sets")
        .insert(sets.map((s) => ({ ...stripIds(s), workout_exercise_id: newEx.id })));
    }
  }
  return newDay.id;
}

export async function duplicateRoutineExercise(exerciseRowId: string) {
  const { data: ex, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("id", exerciseRowId)
    .single();
  if (error) throw error;

  const { count } = await supabase
    .from("workout_exercises")
    .select("id", { count: "exact", head: true })
    .eq("day_id", ex.day_id);

  const { data: newEx, error: nErr } = await supabase
    .from("workout_exercises")
    .insert({ ...stripIds(ex), position: count ?? ex.position + 1 })
    .select("id")
    .single();
  if (nErr) throw nErr;

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_exercise_id", exerciseRowId);
  if (sets && sets.length > 0) {
    await supabase
      .from("workout_sets")
      .insert(sets.map((s) => ({ ...stripIds(s), workout_exercise_id: newEx.id })));
  }
  return newEx.id;
}

function stripIds<T extends { id: string; created_at: string }>(row: T) {
  const { id: _id, created_at: _created, ...rest } = row;
  return rest as Omit<T, "id" | "created_at">;
}

/* ------------------------------ métricas ------------------------------ */

export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function volumeOf(sets: { weight: number | null; reps: number | null }[]): number {
  return sets.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

export function complianceOf(routine: RoutineRow, completedCount: number): number {
  const start = routine.start_date ? new Date(routine.start_date) : new Date(routine.created_at);
  const end = routine.end_date ? new Date(routine.end_date) : new Date();
  const cappedEnd = end.getTime() > Date.now() ? new Date() : end;
  const weeks = Math.max(1, Math.ceil((cappedEnd.getTime() - start.getTime()) / (7 * 86_400_000)));
  const planned = Math.max(1, weeks * (routine.days_per_week || 3));
  return Math.min(100, Math.round((completedCount / planned) * 100));
}

export function streakDays(dates: string[]): number {
  const days = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse();
  if (days.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(days[i - 1]!);
    const curr = new Date(days[i]!);
    if (Math.round((prev.getTime() - curr.getTime()) / 86_400_000) === 1) streak += 1;
    else break;
  }
  return streak;
}

/* ------------------------------ sesiones ------------------------------ */

export async function startSession(clientId: string, templateId: string, dayId: string) {
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("client_id", clientId)
    .eq("day_id", dayId)
    .eq("status", "en_curso")
    .maybeSingle();
  if (existing) return existing;

  const { data: log, error: lErr } = await supabase
    .from("workout_logs")
    .insert({ client_id: clientId, template_id: templateId, day_id: dayId, status: "en_progreso" })
    .select("id")
    .single();
  if (lErr) throw lErr;

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ client_id: clientId, template_id: templateId, day_id: dayId, log_id: log.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchActiveSession(clientId: string, dayId: string) {
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("client_id", clientId)
    .eq("day_id", dayId)
    .eq("status", "en_curso")
    .maybeSingle();
  return data;
}

export async function logSet(input: {
  logId: string;
  clientId: string;
  exerciseId: string | null;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  rpe: number | null;
  notes: string | null;
}) {
  const { error } = await supabase.from("workout_log_sets").insert({
    log_id: input.logId,
    client_id: input.clientId,
    exercise_id: input.exerciseId,
    set_number: input.setNumber,
    weight: input.weight,
    reps: input.reps,
    rir: input.rir,
    rpe: input.rpe,
    notes: input.notes,
    completed: true,
  });
  if (error) throw error;
}

/** Detecta y guarda un récord personal (1RM estimado). Devuelve el valor si es PR. */
export async function detectRecord(
  clientId: string,
  exerciseId: string | null,
  weight: number | null,
  reps: number | null,
): Promise<{ isPr: boolean; value: number; previous: number }> {
  if (!exerciseId || !weight || !reps) return { isPr: false, value: 0, previous: 0 };
  const value = estimate1RM(weight, reps);

  const { data: prev } = await supabase
    .from("personal_records")
    .select("value")
    .eq("client_id", clientId)
    .eq("exercise_id", exerciseId)
    .eq("record_type", "1rm")
    .order("value", { ascending: false })
    .limit(1);

  const previous = prev?.[0]?.value ?? 0;
  if (value <= previous) return { isPr: false, value, previous };

  await supabase.from("personal_records").insert({
    client_id: clientId,
    exercise_id: exerciseId,
    record_type: "1rm",
    value,
    weight,
    reps,
    achieved_on: new Date().toISOString().slice(0, 10),
  });
  return { isPr: true, value, previous };
}

export async function exerciseHistory(clientId: string, exerciseId: string | null) {
  if (!exerciseId) return [] as LogSetRow[];
  const { data } = await supabase
    .from("workout_log_sets")
    .select("*")
    .eq("client_id", clientId)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
}

export async function finishSession(input: {
  sessionId: string;
  logId: string;
  clientId: string;
  durationMin: number;
  feeling: number;
  notes: string | null;
  prsCount: number;
}) {
  const { data: sets } = await supabase
    .from("workout_log_sets")
    .select("weight, reps")
    .eq("log_id", input.logId);

  const rows = sets ?? [];
  const totalVolume = volumeOf(rows);
  const totalReps = rows.reduce((a, s) => a + (s.reps ?? 0), 0);

  await supabase
    .from("workout_logs")
    .update({
      status: "completado",
      duration_min: input.durationMin,
      total_volume: totalVolume,
      total_sets: rows.length,
      total_reps: totalReps,
      prs_count: input.prsCount,
      calories: Math.round(input.durationMin * 7),
      feeling: input.feeling,
      notes: input.notes,
    })
    .eq("id", input.logId);

  await supabase
    .from("workout_sessions")
    .update({ status: "completada", finished_at: new Date().toISOString() })
    .eq("id", input.sessionId);

  await supabase.from("clients").update({ last_activity_at: new Date().toISOString() }).eq("id", input.clientId);

  return { totalVolume, totalSets: rows.length, totalReps };
}

export async function notify(input: {
  userId: string;
  title: string;
  body?: string;
  kind?: string;
  link?: string;
}) {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
    kind: input.kind ?? "entrenamiento",
    link: input.link ?? null,
  });
}
