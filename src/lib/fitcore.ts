import { supabase } from "@/integrations/supabase/client";

export type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  start_date: string;
  status: "activo" | "inactivo" | "pausado" | "finalizado";
  archived: boolean;
  notes: string | null;
  last_activity_at: string | null;
  trainer_id: string;
  gym_id: string | null;
  user_id: string | null;
  created_at: string;
};

export function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export function startOfWeekISO(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // lunes = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function currency(value: number | null | undefined): string {
  return new Intl.NumberFormat("es", { style: "currency", currency: "USD" }).format(value ?? 0);
}

export async function fetchClients(includeArchived = false): Promise<ClientRow[]> {
  let query = supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (!includeArchived) query = query.eq("archived", false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function fetchClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ClientRow | null) ?? null;
}

export const statusTone: Record<ClientRow["status"], string> = {
  activo: "border-success/40 bg-success/10 text-success",
  inactivo: "border-border bg-muted text-muted-foreground",
  pausado: "border-warning/40 bg-warning/10 text-warning",
  finalizado: "border-border bg-muted text-muted-foreground",
};
