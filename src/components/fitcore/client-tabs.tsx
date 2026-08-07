import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  Camera,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  ListChecks,
  Plus,
  Salad,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, SectionCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { currency, formatDate, formatDateTime, startOfWeekISO } from "@/lib/fitcore";

/* ---------------- FOTOS ---------------- */

const CATEGORIES = [
  { value: "frente", label: "Frente" },
  { value: "espalda", label: "Espalda" },
  { value: "perfil_izquierdo", label: "Perfil izquierdo" },
  { value: "perfil_derecho", label: "Perfil derecho" },
  { value: "personalizada", label: "Personalizada" },
] as const;

type Photo = {
  id: string;
  category: string;
  url: string;
  taken_on: string;
  notes: string | null;
};

export function PhotosTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("frente");
  const [takenOn, setTakenOn] = useState(new Date().toISOString().slice(0, 10));
  const [compare, setCompare] = useState(50);

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("client_id", clientId)
        .order("taken_on");
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("progress_photos").insert({
        client_id: clientId,
        url: url.trim(),
        category: category as (typeof CATEGORIES)[number]["value"],
        taken_on: takenOn,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto agregada");
      setOpen(false);
      setUrl("");
      void queryClient.invalidateQueries({ queryKey: ["photos", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const first = photos[0];
  const last = photos[photos.length - 1];

  return (
    <div className="space-y-4">
      <SectionCard
        title="Comparador antes / después"
        subtitle="Desliza para comparar la primera y la última foto"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Agregar foto
          </Button>
        }
      >
        {!first || !last || first.id === last.id ? (
          <EmptyState
            icon={Camera}
            title="Necesitas al menos dos fotos"
            description="Agrega fotografías con fecha para comparar la evolución."
          />
        ) : (
          <div>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl border border-border">
              <img src={first.url} alt="Antes" className="absolute inset-0 h-full w-full object-cover" />
              <div
                className="absolute inset-y-0 right-0 overflow-hidden"
                style={{ width: `${100 - compare}%` }}
              >
                <img
                  src={last.url}
                  alt="Después"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ width: `${(100 / (100 - compare)) * 100}%`, right: 0 }}
                />
              </div>
              <div
                className="absolute inset-y-0 w-0.5 bg-primary glow"
                style={{ left: `${compare}%` }}
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-1 text-[10px] uppercase tracking-widest">
                {formatDate(first.taken_on)}
              </span>
              <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-1 text-[10px] uppercase tracking-widest">
                {formatDate(last.taken_on)}
              </span>
            </div>
            <Slider
              value={[compare]}
              onValueChange={(v) => setCompare(v[0] ?? 50)}
              max={100}
              step={1}
              className="mx-auto mt-4 max-w-sm"
            />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Galería por fecha">
        {photos.length === 0 ? (
          <EmptyState icon={Camera} title="Sin fotos de progreso" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-xl border border-border">
                <img src={p.url} alt={p.category} className="aspect-[3/4] w-full object-cover" />
                <figcaption className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === p.category)?.label} · {formatDate(p.taken_on)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar foto de progreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-url">URL de la imagen</Label>
              <Input
                id="photo-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Button
                    key={c.value}
                    size="sm"
                    variant={category === c.value ? "default" : "secondary"}
                    onClick={() => setCategory(c.value)}
                    type="button"
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taken-on">Fecha</Label>
              <Input
                id="taken-on"
                type="date"
                value={takenOn}
                onChange={(e) => setTakenOn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={!url.trim() || create.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- ENTRENAMIENTOS ---------------- */

export function WorkoutLogsTab({ clientId }: { clientId: string }) {
  const { data: logs = [] } = useQuery({
    queryKey: ["workout-logs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("performed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SectionCard title="Entrenamientos registrados" subtitle="Últimas 50 sesiones">
      {logs.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin entrenamientos"
          description="Aparecerán aquí cuando el cliente registre sus sesiones."
        />
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
            >
              <Dumbbell className="h-4 w-4 shrink-0 text-neon" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{formatDateTime(l.performed_at)}</p>
                <p className="text-xs text-muted-foreground">
                  Volumen: {l.total_volume ?? 0} kg · {l.duration_min ?? "—"} min
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                {l.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- FUERZA ---------------- */

export function StrengthTab({ clientId }: { clientId: string }) {
  const { data } = useQuery({
    queryKey: ["records", clientId],
    queryFn: async () => {
      const [prs, exercises] = await Promise.all([
        supabase
          .from("personal_records")
          .select("*")
          .eq("client_id", clientId)
          .order("achieved_on", { ascending: false }),
        supabase.from("exercises").select("id, name"),
      ]);
      return { prs: prs.data ?? [], exercises: exercises.data ?? [] };
    },
  });

  const prs = data?.prs ?? [];
  const nameOf = (id: string | null) =>
    data?.exercises.find((e) => e.id === id)?.name ?? "Ejercicio";

  return (
    <SectionCard title="Récords y fuerza" subtitle="1RM estimado, mejores cargas y volumen">
      {prs.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin récords aún"
          description="Los récords se calculan automáticamente con cada entrenamiento registrado."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {prs.map((pr) => (
            <li
              key={pr.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
            >
              <Trophy className="h-4 w-4 shrink-0 text-neon" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{nameOf(pr.exercise_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {pr.record_type.toUpperCase()} · {formatDate(pr.achieved_on)}
                </p>
              </div>
              <span className="shrink-0 font-semibold text-neon">{pr.value} kg</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- NUTRICIÓN ---------------- */

export function NutritionTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    water_ml: "",
    notes: "",
  });

  const { data: plan } = useQuery({
    queryKey: ["nutrition-plan", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("client_id", clientId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: meals = [] } = useQuery({
    queryKey: ["meals", plan?.id],
    enabled: !!plan?.id,
    queryFn: async () => {
      const { data } = await supabase.from("meals").select("*").eq("plan_id", plan!.id);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        calories: form.calories ? Number(form.calories) : null,
        protein: form.protein ? Number(form.protein) : null,
        carbs: form.carbs ? Number(form.carbs) : null,
        fat: form.fat ? Number(form.fat) : null,
        water_ml: form.water_ml ? Number(form.water_ml) : null,
        notes: form.notes || null,
      };
      if (plan?.id) {
        const { error } = await supabase.from("nutrition_plans").update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("nutrition_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plan nutricional guardado");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["nutrition-plan", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openDialog() {
    setForm({
      calories: plan?.calories ? String(plan.calories) : "",
      protein: plan?.protein ? String(plan.protein) : "",
      carbs: plan?.carbs ? String(plan.carbs) : "",
      fat: plan?.fat ? String(plan.fat) : "",
      water_ml: plan?.water_ml ? String(plan.water_ml) : "",
      notes: plan?.notes ?? "",
    });
    setOpen(true);
  }

  const macros = [
    { label: "Calorías", value: plan?.calories, unit: "kcal" },
    { label: "Proteínas", value: plan?.protein, unit: "g" },
    { label: "Carbohidratos", value: plan?.carbs, unit: "g" },
    { label: "Grasas", value: plan?.fat, unit: "g" },
    { label: "Agua", value: plan?.water_ml, unit: "ml" },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title="Objetivos nutricionales"
        action={
          canEdit ? (
            <Button size="sm" onClick={openDialog}>
              {plan ? "Editar plan" : "Crear plan"}
            </Button>
          ) : undefined
        }
      >
        {!plan ? (
          <EmptyState
            icon={Salad}
            title="Sin plan nutricional"
            description="Define calorías, macros y agua para este cliente."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {macros.map((m) => (
              <div key={m.label} className="rounded-xl border border-border/70 bg-surface p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-neon">
                  {m.value ?? "—"}
                  <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {plan && (
        <SectionCard title="Comidas" subtitle="Desayuno, almuerzo, cena y snacks">
          {meals.length === 0 ? (
            <EmptyState icon={Salad} title="Sin comidas definidas" />
          ) : (
            <ul className="space-y-2">
              {meals.map((m) => (
                <li key={m.id} className="rounded-xl border border-border/70 bg-surface px-3 py-2.5">
                  <p className="text-sm font-medium capitalize">{m.meal_type}</p>
                  <p className="text-xs text-muted-foreground">{m.name ?? "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan nutricional</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["calories", "Calorías (kcal)"],
                ["protein", "Proteínas (g)"],
                ["carbs", "Carbohidratos (g)"],
                ["fat", "Grasas (g)"],
                ["water_ml", "Agua (ml)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nutrition-notes">Notas</Label>
            <Textarea
              id="nutrition-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- HÁBITOS ---------------- */

const HABIT_PRESETS = [
  { icon: "💧", name: "Agua" },
  { icon: "🚶", name: "Pasos" },
  { icon: "😴", name: "Sueño" },
  { icon: "🥩", name: "Proteína" },
  { icon: "🏋️", name: "Entrenamiento" },
  { icon: "🥗", name: "Alimentación" },
];

export function HabitsTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["habits", clientId],
    queryFn: async () => {
      const [habits, logs] = await Promise.all([
        supabase.from("habits").select("*").eq("client_id", clientId).eq("active", true),
        supabase
          .from("habit_logs")
          .select("*")
          .eq("client_id", clientId)
          .gte("date", new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)),
      ]);
      return { habits: habits.data ?? [], logs: logs.data ?? [] };
    },
  });

  const addHabit = useMutation({
    mutationFn: async (preset: (typeof HABIT_PRESETS)[number]) => {
      const { error } = await supabase
        .from("habits")
        .insert({ client_id: clientId, name: preset.name, icon: preset.icon });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hábito asignado");
      void queryClient.invalidateQueries({ queryKey: ["habits", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-4">
      {canEdit && (
        <SectionCard title="Asignar hábitos" subtitle="Selecciona los hábitos a seguir">
          <div className="flex flex-wrap gap-2">
            {HABIT_PRESETS.filter((p) => !habits.some((h) => h.name === p.name)).map((p) => (
              <Button
                key={p.name}
                size="sm"
                variant="secondary"
                onClick={() => addHabit.mutate(p)}
                disabled={addHabit.isPending}
              >
                <span className="mr-1.5">{p.icon}</span> {p.name}
              </Button>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Cumplimiento (30 días)">
        {habits.length === 0 ? (
          <EmptyState icon={Target} title="Sin hábitos asignados" />
        ) : (
          <ul className="space-y-3">
            {habits.map((h) => {
              const done = logs.filter((l) => l.habit_id === h.id && l.completed).length;
              const pct = Math.round((done / 30) * 100);
              return (
                <li key={h.id} className="rounded-xl border border-border/70 bg-surface p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="mr-2">{h.icon}</span>
                      {h.name}
                    </span>
                    <span className="shrink-0 font-medium text-neon">{pct}%</span>
                  </div>
                  <Progress value={pct} className="mt-2 h-1.5" />
                  <p className="mt-1.5 text-xs text-muted-foreground">{done} de 30 días</p>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------------- CHECK-INS ---------------- */

export function CheckInsTab({ clientId, canReview }: { clientId: string; canReview: boolean }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("client_id", clientId)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("check_ins")
        .insert({ client_id: clientId, week_start: startOfWeekISO(), status: "pendiente" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in solicitado");
      void queryClient.invalidateQueries({ queryKey: ["checkins", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("check_ins")
        .update({
          status: "revisado",
          reviewed_at: new Date().toISOString(),
          trainer_feedback: feedback[id] ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in revisado");
      void queryClient.invalidateQueries({ queryKey: ["checkins", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title="Check-ins semanales"
      action={
        canReview ? (
          <Button size="sm" onClick={() => request.mutate()} disabled={request.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Solicitar check-in
          </Button>
        ) : undefined
      }
    >
      {checkins.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Sin check-ins" />
      ) : (
        <ul className="space-y-3">
          {checkins.map((c) => (
            <li key={c.id} className="rounded-xl border border-border/70 bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Semana del {formatDate(c.week_start)}</p>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {c.status}
                </Badge>
              </div>
              {c.status !== "pendiente" && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[
                    ["Energía", c.energy],
                    ["Sueño", c.sleep],
                    ["Estrés", c.stress],
                    ["Hambre", c.hunger],
                    ["Motivación", c.motivation],
                    ["Entrenos", c.workouts_done],
                    ["Nutrición", c.nutrition_compliance],
                    ["Peso", c.weight_kg],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-background/50 p-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-medium">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              )}
              {c.comments && <p className="mt-3 text-sm text-muted-foreground">{c.comments}</p>}
              {canReview && c.status === "completado" && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Feedback para tu cliente…"
                    value={feedback[c.id] ?? ""}
                    onChange={(e) => setFeedback((f) => ({ ...f, [c.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => review.mutate(c.id)} disabled={review.isPending}>
                    Marcar como revisado
                  </Button>
                </div>
              )}
              {c.trainer_feedback && (
                <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-sm">
                  <span className="font-medium text-neon">Feedback: </span>
                  {c.trainer_feedback}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- AGENDA (cliente) ---------------- */

export function ClientAgendaTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "Sesión de entrenamiento",
    starts_at: "",
    duration_min: "60",
    notes: "",
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_id", clientId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sesión no válida");
      if (!form.starts_at) throw new Error("Selecciona fecha y hora");
      const { error } = await supabase.from("appointments").insert({
        client_id: clientId,
        trainer_id: user.id,
        title: form.title,
        starts_at: new Date(form.starts_at).toISOString(),
        duration_min: Number(form.duration_min) || 60,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sesión agendada");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["appointments", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: status as "confirmada" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments", clientId] });
    },
  });

  return (
    <SectionCard
      title="Agenda del cliente"
      action={
        canEdit ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva sesión
          </Button>
        ) : undefined
      }
    >
      {appointments.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin sesiones" />
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-neon" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(a.starts_at)} · {a.duration_min} min
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                {a.status}
              </Badge>
              {canEdit && a.status !== "cancelada" && (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setStatus.mutate({ id: a.id, status: "confirmada" })}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: a.id, status: "cancelada" })}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva sesión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_at">Fecha y hora</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (min)</Label>
              <Input
                id="duration"
                type="number"
                value={form.duration_min}
                onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apt-notes">Notas</Label>
              <Textarea
                id="apt-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- PAGOS ---------------- */

export function ClientPaymentsTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    plan_name: "Mensualidad",
    amount: "",
    method: "transferencia",
    next_payment_date: "",
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sesión no válida");
      const { error } = await supabase.from("payments").insert({
        client_id: clientId,
        trainer_id: user.id,
        plan_name: form.plan_name,
        amount: Number(form.amount) || 0,
        method: form.method,
        next_payment_date: form.next_payment_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago registrado");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["client-payments", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "activo", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago confirmado");
      void queryClient.invalidateQueries({ queryKey: ["client-payments", clientId] });
    },
  });

  return (
    <SectionCard
      title="Pagos del cliente"
      action={
        canEdit ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Registrar pago
          </Button>
        ) : undefined
      }
    >
      {payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sin pagos registrados" />
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
            >
              <CreditCard className="h-4 w-4 shrink-0 text-neon" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{p.plan_name}</p>
                <p className="text-xs text-muted-foreground">
                  Próximo pago: {formatDate(p.next_payment_date)} · {p.method ?? "—"}
                </p>
              </div>
              <span className="font-semibold">{currency(Number(p.amount))}</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {p.status}
              </Badge>
              {canEdit && p.status !== "activo" && (
                <Button size="sm" variant="secondary" onClick={() => markPaid.mutate(p.id)}>
                  Marcar pagado
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan_name">Plan</Label>
              <Input
                id="plan_name"
                value={form.plan_name}
                onChange={(e) => setForm((f) => ({ ...f, plan_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <Input
                id="method"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_payment_date">Próximo pago</Label>
              <Input
                id="next_payment_date"
                type="date"
                value={form.next_payment_date}
                onChange={(e) => setForm((f) => ({ ...f, next_payment_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- RUTINAS ASIGNADAS ---------------- */

export function ClientRoutinesTab({ clientId }: { clientId: string }) {
  const { data: routines = [] } = useQuery({
    queryKey: ["client-routines", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SectionCard title="Rutinas asignadas">
      {routines.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sin rutinas asignadas"
          description="Crea una rutina desde el módulo Rutinas y asígnala a este cliente."
        />
      ) : (
        <ul className="space-y-2">
          {routines.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
            >
              <ListChecks className="h-4 w-4 shrink-0 text-neon" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.weeks} semanas</p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                {r.active ? "activa" : "inactiva"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
