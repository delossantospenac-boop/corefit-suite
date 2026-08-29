import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export type ClassWithClient = AppointmentRow & {
  clients: { id: string; full_name: string; photo_url: string | null; classes_purchased: number } | null;
  workout_templates: { id: string; name: string } | null;
  workout_days: { id: string; name: string; day_index: number } | null;
};

export const CLASS_TYPES = ["personal", "grupal", "online", "evaluacion", "funcional", "movilidad"] as const;
export const CLASS_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: "programada", label: "Programada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_asistio", label: "No asistió" },
];
export const classStatusTone: Record<AppointmentStatus, string> = {
  programada: "border-warning/40 bg-warning/10 text-warning",
  confirmada: "border-primary/40 bg-primary/10 text-neon",
  completada: "border-success/40 bg-success/10 text-success",
  cancelada: "border-destructive/40 bg-destructive/10 text-destructive",
  no_asistio: "border-border bg-muted text-muted-foreground",
};
const SELECT = "*, clients(id, full_name, photo_url, classes_purchased), workout_templates(id, name), workout_days(id, name, day_index)";

export type RangeKey = "dia" | "semana" | "mes";
export function rangeFor(key: RangeKey, base = new Date()): { from: Date; to: Date } {
  const from = new Date(base); from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (key === "dia") to.setDate(to.getDate() + 1);
  else if (key === "semana") { const dow = (from.getDay() + 6) % 7; from.setDate(from.getDate() - dow); to.setTime(from.getTime()); to.setDate(to.getDate() + 7); }
  else { from.setDate(1); to.setTime(from.getTime()); to.setMonth(to.getMonth() + 1); }
  return { from, to };
}

export async function fetchClasses(key: RangeKey, base = new Date()): Promise<ClassWithClient[]> {
  const { from, to } = rangeFor(key, base);
  const { data, error } = await supabase.from("appointments").select(SELECT).gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at", { ascending: true });
  if (error) throw error; return (data ?? []) as unknown as ClassWithClient[];
}
export async function fetchClientClasses(clientId: string): Promise<ClassWithClient[]> {
  const { data, error } = await supabase.from("appointments").select(SELECT).eq("client_id", clientId).order("starts_at", { ascending: true });
  if (error) throw error; return (data ?? []) as unknown as ClassWithClient[];
}

export type ClassInput = { clientId: string; trainerId: string; title: string; startsAt: string; durationMin: number; classType: string | null; templateId: string | null; dayId: string | null; planNote: string | null; notes: string | null; countsAgainstPackage: boolean };
export async function createClass(input: ClassInput): Promise<string> {
  const { data, error } = await supabase.from("appointments").insert({ client_id: input.clientId, trainer_id: input.trainerId, title: input.title, starts_at: input.startsAt, duration_min: input.durationMin, class_type: input.classType, template_id: input.templateId, day_id: input.dayId, plan_note: input.planNote, notes: input.notes, counts_against_package: input.countsAgainstPackage }).select("id").single();
  if (error) throw error; return data.id;
}

export async function createRecurringClasses(input: { clientId: string; trainerId: string; totalClasses: number; startDate: string; weekdays: number[]; time: string; durationMin: number; classType?: string | null }) {
  if (input.totalClasses <= 0) throw new Error("El número de clases debe ser mayor que 0");
  if (!input.weekdays.length) throw new Error("Selecciona al menos un día de entrenamiento");
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new Error("Hora no válida");
  const { data: client, error: clientError } = await supabase.from("clients").select("full_name").eq("id", input.clientId).maybeSingle();
  if (clientError) throw clientError;
  const [hours, minutes] = input.time.split(":").map(Number);
  const cursor = new Date(`${input.startDate}T00:00:00`);
  if (Number.isNaN(cursor.getTime())) throw new Error("Fecha de inicio no válida");
  const dates: Date[] = [];
  for (let i = 0; i < 370 && dates.length < input.totalClasses; i += 1) {
    if (input.weekdays.includes(cursor.getDay())) { const session = new Date(cursor); session.setHours(hours, minutes, 0, 0); dates.push(session); }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (dates.length < input.totalClasses) throw new Error("No se pudieron generar todas las clases con los días seleccionados");
  const end = new Date(dates[dates.length - 1]); end.setMinutes(end.getMinutes() + input.durationMin);
  const { data: existing, error: existingError } = await supabase.from("appointments").select("starts_at").eq("client_id", input.clientId).gte("starts_at", dates[0].toISOString()).lte("starts_at", end.toISOString());
  if (existingError) throw existingError;
  const existingTimes = new Set((existing ?? []).map((row) => row.starts_at));
  const rows = dates.filter((d) => !existingTimes.has(d.toISOString())).map((d) => ({ client_id: input.clientId, trainer_id: input.trainerId, title: `Clase · ${client?.full_name ?? "Cliente"}`, starts_at: d.toISOString(), duration_min: input.durationMin, class_type: input.classType ?? "personal", template_id: null, day_id: null, plan_note: null, notes: "Programada automáticamente desde el paquete de clases.", counts_against_package: true }));
  if (!rows.length) return { created: 0, skipped: dates.length };
  const { error } = await supabase.from("appointments").insert(rows);
  if (error) throw error;
  return { created: rows.length, skipped: dates.length - rows.length };
}

export async function updateClass(id: string, patch: Partial<AppointmentRow>) { const { error } = await supabase.from("appointments").update(patch).eq("id", id); if (error) throw error; }
export async function deleteClass(id: string) { const { error } = await supabase.from("appointments").delete().eq("id", id); if (error) throw error; }
export async function startClass(id: string) { await updateClass(id, { started_at: new Date().toISOString(), status: "confirmada" }); }
export async function completeClass(input: { id: string; durationMin: number; notes: string | null; attended: boolean }) { await updateClass(input.id, { status: input.attended ? "completada" : "no_asistio", attended: input.attended, completed_at: new Date().toISOString(), actual_duration_min: input.durationMin, notes: input.notes }); }

export type ClassPackage = { purchased: number; completed: number; remaining: number };
export async function classPackage(clientId: string): Promise<ClassPackage> {
  const [{ data: client }, { count }] = await Promise.all([supabase.from("clients").select("classes_purchased").eq("id", clientId).maybeSingle(), supabase.from("appointments").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "completada").eq("counts_against_package", true)]);
  const purchased = client?.classes_purchased ?? 0; const completed = count ?? 0; return { purchased, completed, remaining: purchased - completed };
}
export async function setClassesPurchased(clientId: string, total: number) { const { error } = await supabase.from("clients").update({ classes_purchased: Math.max(0, Math.round(total)) }).eq("id", clientId); if (error) throw error; }
export function nextClass(list: ClassWithClient[]): ClassWithClient | null { const now = Date.now(); return list.find((c) => new Date(c.starts_at).getTime() >= now - 2 * 60 * 60 * 1000 && c.status !== "cancelada" && c.status !== "completada") ?? null; }
