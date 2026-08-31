import { supabase } from "@/integrations/supabase/client";
import type { AiPlan } from "@/lib/ai-rutinas.functions";
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  addDay,
  createRoutine,
  fetchExerciseLibrary,
  type RoutineGoal,
  type RoutineLevel,
} from "@/lib/rutinas";

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function safeMuscle(value: string | null): string | null {
  const n = norm(value ?? "").replace(/ /g, "_");
  return (MUSCLE_GROUPS as readonly string[]).includes(n) ? n : null;
}

function safeEquipment(value: string | null): string | null {
  const n = norm(value ?? "").replace(/ /g, "_");
  return (EQUIPMENT as readonly string[]).includes(n) ? n : null;
}

export type ApplyPlanOptions = {
  plan: AiPlan;
  trainerId: string;
  clientId: string | null;
  goal: RoutineGoal;
  level: RoutineLevel;
  weeks: number;
  asTemplate: boolean;
  exerciseType?: string;
};

/** Crea la rutina completa (días, ejercicios y series planificadas) a partir del plan de IA. */
export async function applyGeneratedPlan(opts: ApplyPlanOptions): Promise<string> {
  const { plan, trainerId, clientId, goal, level, weeks, asTemplate } = opts;

  const library = await fetchExerciseLibrary();
  const byName = new Map(library.map((e) => [norm(e.name), e.id]));

  const routineId = await createRoutine(
    {
      name: plan.name?.trim() || "Rutina generada con IA",
      client_id: asTemplate ? null : clientId,
      goal,
      level,
      status: "activa",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      days_per_week: plan.days.length,
      suggested_time: null,
      weeks,
      description: plan.description ?? null,
      notes: plan.notes ?? null,
      is_template: asTemplate,
    },
    trainerId,
  );

  for (let d = 0; d < plan.days.length; d += 1) {
    const day = plan.days[d]!;
    const dayId = await addDay(routineId, d, day.name?.trim() || `Día ${d + 1}`);
    if (day.description) {
      await supabase.from("workout_days").update({ description: day.description }).eq("id", dayId);
    }

    for (let i = 0; i < (day.exercises ?? []).length; i += 1) {
      const ex = day.exercises[i]!;
      const key = norm(ex.name ?? "");
      if (!key) continue;
      let exerciseId = byName.get(key);

      if (!exerciseId) {
        const { data: created } = await supabase
          .from("exercises")
          .insert({
            trainer_id: trainerId,
            name: ex.name.trim(),
            muscle_group: safeMuscle(ex.muscle_group),
            equipment: safeEquipment(ex.equipment),
            difficulty: level === "avanzado" ? "avanzado" : level,
            exercise_type: opts.exerciseType ?? "funcional",
          })
          .select("id")
          .single();
        if (!created) continue;
        exerciseId = created.id;
        byName.set(key, exerciseId);
      }

      const sets = Math.min(Math.max(Math.round(ex.sets || 3), 1), 10);
      const reps = (ex.reps ?? "10").toString().slice(0, 20);
      const rest = Math.min(Math.max(Math.round(ex.rest_seconds || 90), 15), 600);
      const rir = ex.rir == null ? null : Math.min(Math.max(Number(ex.rir), 0), 5);
      const rpe = ex.rpe == null ? null : Math.min(Math.max(Number(ex.rpe), 1), 10);
      const tempo = ex.tempo?.toString().slice(0, 30) || null;

      const { data: we } = await supabase
        .from("workout_exercises")
        .insert({
          day_id: dayId,
          exercise_id: exerciseId,
          position: i,
          sets,
          reps,
          rest_seconds: rest,
          rir,
          rpe,
          tempo,
          notes: ex.notes ?? null,
        })
        .select("id")
        .single();
      if (!we) continue;

      await supabase.from("workout_sets").insert(
        Array.from({ length: sets }).map((_, s) => ({
          workout_exercise_id: we.id,
          set_number: s + 1,
          reps,
          rest_seconds: rest,
          rir,
          rpe,
          tempo,
        })),
      );
    }
  }

  return routineId;
}
