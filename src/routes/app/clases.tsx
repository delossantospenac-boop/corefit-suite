import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/fitcore/primitives";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fetchClients, formatDate, formatDateTime } from "@/lib/fitcore";
import {
  CLASS_STATUSES,
  CLASS_TYPES,
  classPackage,
  classStatusTone,
  completeClass,
  createClass,
  deleteClass,
  fetchClasses,
  fetchClientClasses,
  rangeFor,
  startClass,
  updateClass,
  type AppointmentStatus,
  type ClassWithClient,
  type RangeKey,
} from "@/lib/clases";
import { fetchClientRoutines, fetchRoutine, prettyLabel } from "@/lib/rutinas";
import { formatWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/clases")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clases · FITCORE" },
      {
        name: "description",
        content: "Agenda, gestiona y completa las clases de tus clientes.",
      },
    ],
  }),
  component: ClasesPage,
});

/* ------------------------------ helpers ------------------------------ */

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

function shiftDate(base: Date, key: RangeKey, dir: 1 | -1): Date {
  const d = new Date(base);
  if (key === "dia") d.setDate(d.getDate() + dir);
  else if (key === "semana") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

function rangeLabel(key: RangeKey, base: Date): string {
  const { from, to } = rangeFor(key, base);
  if (key === "dia") {
    return from.toLocaleDateString("es", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
  if (key === "semana") {
    const end = new Date(to);
    end.setDate(end.getDate() - 1);
    return `${from.toLocaleDateString("es", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return from.toLocaleDateString("es", { month: "long", year: "numeric" });
}

const PENDING_STATUSES: AppointmentStatus[] = ["programada", "confirmada"];

/* ------------------------------ página ------------------------------ */

function ClasesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rangeKey, setRangeKey] = useState<RangeKey>("semana");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassWithClient | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ["classes", rangeKey, baseDate.toDateString()],
    queryFn: () => fetchClasses(rangeKey, baseDate),
  });
  const clientsQuery = useQuery({ queryKey: ["clients", false], queryFn: () => fetchClients(false) });

  const classes = classesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const total = classes.length;
  const completed = classes.filter((c) => c.status === "completada").length;
  const pending = classes.filter((c) => PENDING_STATUSES.includes(c.status)).length;

  const remove = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      toast.success("Clase eliminada");
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detailClass = classes.find((c) => c.id === detailId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clases"
        subtitle="Agenda y gestiona las sesiones con tus clientes"
        action={
          <Button
            size="lg"
            className="shadow-neon"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> ➕ Crear clase
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total del periodo" value={total} icon={CalendarClock} tone="neon" />
        <StatCard label="Completadas" value={completed} icon={CalendarCheck2} tone="success" />
        <StatCard label="Pendientes" value={pending} icon={Clock} tone="warning" />
      </div>

      <div className="card-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
          <TabsList>
            <TabsTrigger value="dia">Día</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button variant="ghost" size="icon" onClick={() => setBaseDate((d) => shiftDate(d, rangeKey, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-0 flex-1 text-center text-sm font-medium capitalize sm:flex-none">
            {rangeLabel(rangeKey, baseDate)}
          </p>
          <Button variant="ghost" size="icon" onClick={() => setBaseDate((d) => shiftDate(d, rangeKey, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBaseDate(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      {classesQuery.isLoading ? (
        <ListSkeleton rows={5} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin clases en este periodo"
          description="Crea una clase para empezar a agendar sesiones con tus clientes."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Crear clase
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {classes.map((c) => (
            <li key={c.id}>
              <ClassRow
                cls={c}
                onOpen={() => setDetailId(c.id)}
                onEdit={() => {
                  setEditing(c);
                  setFormOpen(true);
                }}
                onDelete={() => {
                  if (confirm(`¿Eliminar la clase de ${c.clients?.full_name ?? "este cliente"}?`)) {
                    remove.mutate(c.id);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ClassFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        clients={clients}
        trainerId={user?.id ?? null}
      />

      <ClassDetailSheet
        cls={detailClass}
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        onEdit={() => {
          if (detailClass) {
            setEditing(detailClass);
            setFormOpen(true);
            setDetailId(null);
          }
        }}
      />
    </div>
  );
}

/* ------------------------------ fila de clase ------------------------------ */

function ClassRow({
  cls,
  onOpen,
  onEdit,
  onDelete,
}: {
  cls: ClassWithClient;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusInfo = CLASS_STATUSES.find((s) => s.value === cls.status);
  return (
    <div className="card-surface flex flex-col gap-3 p-4 transition-all duration-300 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{formatDateTime(cls.starts_at)}</span>
          <Badge variant="outline" className={cn("text-[10px] uppercase", classStatusTone[cls.status])}>
            {statusInfo?.label ?? cls.status}
          </Badge>
          {cls.class_type && (
            <Badge variant="secondary" className="text-[10px] uppercase">
              {prettyLabel(cls.class_type)}
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-medium">{cls.clients?.full_name ?? "Cliente"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {cls.workout_templates?.name ? `${cls.workout_templates.name}` : "Sin rutina asignada"}
          {cls.workout_days?.name ? ` · ${cls.workout_days.name}` : ""}
        </p>
        {cls.plan_note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">📋 {cls.plan_note}</p>}
      </button>
      <div className="flex shrink-0 gap-1.5 self-end sm:self-center">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ diálogo crear/editar ------------------------------ */

function ClassFormDialog({
  open,
  onOpenChange,
  editing,
  clients,
  trainerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ClassWithClient | null;
  clients: { id: string; full_name: string }[];
  trainerId: string | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;

  const [clientId, setClientId] = useState(editing?.client_id ?? "");
  const [startsAt, setStartsAt] = useState(editing ? toLocalInput(editing.starts_at) : toLocalInput(new Date().toISOString()));
  const [durationMin, setDurationMin] = useState(editing?.duration_min ?? 60);
  const [classType, setClassType] = useState(editing?.class_type ?? CLASS_TYPES[0]);
  const [templateId, setTemplateId] = useState(editing?.template_id ?? "");
  const [dayId, setDayId] = useState(editing?.day_id ?? "");
  const [planNote, setPlanNote] = useState(editing?.plan_note ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [countsAgainstPackage, setCountsAgainstPackage] = useState(editing?.counts_against_package ?? true);

  const resetFrom = (c: ClassWithClient | null) => {
    setClientId(c?.client_id ?? "");
    setStartsAt(c ? toLocalInput(c.starts_at) : toLocalInput(new Date().toISOString()));
    setDurationMin(c?.duration_min ?? 60);
    setClassType(c?.class_type ?? CLASS_TYPES[0]);
    setTemplateId(c?.template_id ?? "");
    setDayId(c?.day_id ?? "");
    setPlanNote(c?.plan_note ?? "");
    setNotes(c?.notes ?? "");
    setCountsAgainstPackage(c?.counts_against_package ?? true);
  };

  // resync when editing target changes (dialog re-key handled by parent via key prop is simpler, but we guard here too)
  const [lastEditingId, setLastEditingId] = useState<string | null | undefined>(editing?.id);
  if (editing?.id !== lastEditingId) {
    setLastEditingId(editing?.id ?? null);
    resetFrom(editing);
  }

  const routinesQuery = useQuery({
    queryKey: ["client-routines", clientId],
    queryFn: () => fetchClientRoutines(clientId),
    enabled: !!clientId,
  });
  const routines = routinesQuery.data ?? [];

  const templateQuery = useQuery({
    queryKey: ["routine-full", templateId],
    queryFn: () => fetchRoutine(templateId),
    enabled: !!templateId,
  });
  const days = templateQuery.data?.days ?? [];
  const selectedDay = days.find((d) => d.id === dayId) ?? null;

  const save = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Selecciona un cliente");
      if (!trainerId) throw new Error("Sesión no válida");
      const client = clients.find((c) => c.id === clientId);
      const payload = {
        clientId,
        trainerId,
        title: `Clase · ${client?.full_name ?? ""}`,
        startsAt: fromLocalInput(startsAt),
        durationMin,
        classType: classType || null,
        templateId: templateId || null,
        dayId: dayId || null,
        planNote: planNote || null,
        notes: notes || null,
        countsAgainstPackage,
      };
      if (isEdit && editing) {
        await updateClass(editing.id, {
          client_id: payload.clientId,
          title: payload.title,
          starts_at: payload.startsAt,
          duration_min: payload.durationMin,
          class_type: payload.classType,
          template_id: payload.templateId,
          day_id: payload.dayId,
          plan_note: payload.planNote,
          notes: payload.notes,
          counts_against_package: payload.countsAgainstPackage,
        });
      } else {
        await createClass(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Clase actualizada" : "Clase creada");
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar clase" : "Crear clase"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setTemplateId("");
                setDayId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duración (min)</Label>
              <Input
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de clase</Label>
            <Select value={classType} onValueChange={setClassType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de clase" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {prettyLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rutina del cliente</Label>
              <Select
                value={templateId || "__none__"}
                onValueChange={(v) => {
                  setTemplateId(v === "__none__" ? "" : v);
                  setDayId("");
                }}
                disabled={!clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin rutina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin rutina</SelectItem>
                  {routines.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Día de la rutina</Label>
              <Select
                value={dayId || "__none__"}
                onValueChange={(v) => setDayId(v === "__none__" ? "" : v)}
                disabled={!templateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin día" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin día</SelectItem>
                  {days.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedDay && (
            <div className="rounded-lg border border-border/70 bg-background/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ejercicios de {selectedDay.name}
              </p>
              {selectedDay.exercises.length === 0 ? (
                <p className="text-xs text-muted-foreground">Este día no tiene ejercicios cargados.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedDay.exercises.map((ex) => (
                    <li key={ex.id} className="text-xs">
                      <p className="font-medium">{ex.exercise?.name ?? "Ejercicio"}</p>
                      {ex.plannedSets.length > 0 ? (
                        <ul className="mt-0.5 flex flex-wrap gap-1.5 text-muted-foreground">
                          {ex.plannedSets.map((s) => (
                            <li key={s.id} className="rounded bg-muted px-1.5 py-0.5">
                              #{s.set_number} · {s.reps ?? "—"} reps
                              {s.weight !== null ? ` · ${formatWeight(s.weight, "kg")}` : ""}
                              {s.rir !== null ? ` · RIR ${s.rir}` : ""}
                              {s.rpe !== null ? ` · RPE ${s.rpe}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-0.5 text-muted-foreground">
                          {ex.sets ?? "—"} series · {ex.reps ?? "—"} reps
                          {ex.weight !== null ? ` · ${formatWeight(ex.weight, "kg")}` : ""}
                          {ex.rir !== null ? ` · RIR ${ex.rir}` : ""}
                          {ex.rpe !== null ? ` · RPE ${ex.rpe}` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Qué le toca hacer ese día</Label>
            <Textarea
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              placeholder="Ej. Enfocar en técnica de sentadilla, subir carga en press banca…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
            <div>
              <p className="text-sm font-medium">Descuenta del paquete de clases</p>
              <p className="text-xs text-muted-foreground">Al completarse, resta una clase del paquete contratado.</p>
            </div>
            <Switch checked={countsAgainstPackage} onCheckedChange={setCountsAgainstPackage} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={save.isPending || !clientId} onClick={() => save.mutate()}>
            {isEdit ? "Guardar cambios" : "Crear clase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ detalle de clase ------------------------------ */

function ClassDetailSheet({
  cls,
  open,
  onOpenChange,
  onEdit,
}: {
  cls: ClassWithClient | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const clientId = cls?.client_id ?? null;
  const [completeOpen, setCompleteOpen] = useState(false);
  const [attended, setAttended] = useState(true);
  const [actualDuration, setActualDuration] = useState(cls?.duration_min ?? 60);
  const [completeNotes, setCompleteNotes] = useState("");

  const clientQuery = useQuery({
    queryKey: ["client-brief", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && open,
  });

  const assessmentQuery = useQuery({
    queryKey: ["client-last-assessment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && open,
  });

  const logsQuery = useQuery({
    queryKey: ["client-recent-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("performed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId && open,
  });

  const historyQuery = useQuery({
    queryKey: ["client-classes", clientId],
    queryFn: () => (clientId ? fetchClientClasses(clientId) : Promise.resolve([])),
    enabled: !!clientId && open,
  });

  const packageQuery = useQuery({
    queryKey: ["class-package", clientId],
    queryFn: () => (clientId ? classPackage(clientId) : Promise.resolve(null)),
    enabled: !!clientId && open,
  });

  const dayQuery = useQuery({
    queryKey: ["routine-full", cls?.template_id],
    queryFn: () => fetchRoutine(cls!.template_id as string),
    enabled: !!cls?.template_id && open,
  });
  const assignedDay = dayQuery.data?.days.find((d) => d.id === cls?.day_id) ?? null;

  const start = useMutation({
    mutationFn: () => startClass(cls!.id),
    onSuccess: () => {
      toast.success("Clase iniciada");
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: () =>
      completeClass({ id: cls!.id, durationMin: actualDuration, notes: completeNotes || null, attended }),
    onSuccess: () => {
      toast.success(
        attended && cls?.counts_against_package
          ? "Clase completada · se descontó 1 clase del paquete"
          : "Clase completada",
      );
      setCompleteOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      void queryClient.invalidateQueries({ queryKey: ["class-package", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["client-classes", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!cls) return null;
  const client = clientQuery.data;
  const assessment = assessmentQuery.data;
  const pkg = packageQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Detalle de la clase</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] uppercase", classStatusTone[cls.status])}>
              {CLASS_STATUSES.find((s) => s.value === cls.status)?.label ?? cls.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{formatDateTime(cls.starts_at)}</span>
            <span className="text-sm text-muted-foreground">· {cls.duration_min} min</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {cls.status !== "completada" && cls.status !== "no_asistio" && (
              <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> ▶ Iniciar clase
              </Button>
            )}
            {cls.status !== "completada" && cls.status !== "no_asistio" && (
              <Button size="sm" variant="secondary" onClick={() => setCompleteOpen(true)}>
                ✓ Completar clase
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
            </Button>
          </div>

          {/* cliente */}
          <section className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
            <p className="mt-1 font-medium">{cls.clients?.full_name ?? "Cliente"}</p>
            <p className="text-xs text-muted-foreground">
              Objetivo: {prettyLabel(client?.goal ?? null)} · Estado: {prettyLabel(client?.status ?? null)}
            </p>
            {clientId && (
              <Link
                to="/app/clientes/$clientId"
                params={{ clientId }}
                className="mt-2 inline-block text-xs font-medium text-neon hover:underline"
              >
                Ver ficha completa →
              </Link>
            )}
          </section>

          {/* paquete de clases */}
          {pkg && (
            <section className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-background/50 py-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Contratadas</p>
                <p className="text-sm font-semibold">{pkg.purchased}</p>
              </div>
              <div className="rounded-lg bg-background/50 py-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Completadas</p>
                <p className="text-sm font-semibold">{pkg.completed}</p>
              </div>
              <div className="rounded-lg bg-background/50 py-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Restantes</p>
                <p className="text-sm font-semibold">{pkg.remaining}</p>
              </div>
            </section>
          )}

          {/* última evaluación */}
          <section className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Última evaluación</p>
            {assessment ? (
              <p className="mt-1 text-sm">
                {formatDate(assessment.date)} · {formatWeight(assessment.weight_kg, "kg")}
                {assessment.body_fat_pct !== null ? ` · ${assessment.body_fat_pct}% grasa` : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Sin evaluaciones registradas.</p>
            )}
          </section>

          {/* progreso */}
          <section className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progreso reciente</p>
            {(logsQuery.data ?? []).length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Sin entrenamientos registrados.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {(logsQuery.data ?? []).map((log) => (
                  <li key={log.id} className="text-xs text-muted-foreground">
                    {formatDate(log.performed_at)} · {log.total_sets} series · {log.total_volume ?? 0} kg volumen
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* rutina asignada */}
          <section className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rutina asignada</p>
            {cls.workout_templates?.name ? (
              <>
                <p className="mt-1 text-sm font-medium">
                  {cls.workout_templates.name} {assignedDay ? `· ${assignedDay.name}` : ""}
                </p>
                {cls.plan_note && <p className="mt-1 text-xs text-muted-foreground">📋 {cls.plan_note}</p>}
                {assignedDay && (
                  <ul className="mt-2 space-y-1.5">
                    {assignedDay.exercises.map((ex) => (
                      <li key={ex.id} className="text-xs">
                        <span className="font-medium">{ex.exercise?.name ?? "Ejercicio"}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {ex.sets ?? "—"} series · {ex.reps ?? "—"} reps
                          {ex.weight !== null ? ` · ${formatWeight(ex.weight, "kg")}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Sin rutina asignada para esta clase.</p>
            )}
          </section>

          {/* historial */}
          <section className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial de clases</p>
            {(historyQuery.data ?? []).length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Sin clases previas.</p>
            ) : (
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                {(historyQuery.data ?? [])
                  .filter((h) => h.id !== cls.id)
                  .slice(-8)
                  .reverse()
                  .map((h) => (
                    <li key={h.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDateTime(h.starts_at)}</span>
                      <Badge variant="outline" className={cn("text-[9px] uppercase", classStatusTone[h.status])}>
                        {h.status}
                      </Badge>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Completar clase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Asistencia</Label>
              <Select value={attended ? "si" : "no"} onValueChange={(v) => setAttended(v === "si")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Asistió</SelectItem>
                  <SelectItem value="no">No asistió</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duración real (min)</Label>
              <Input
                type="number"
                min={0}
                value={actualDuration}
                onChange={(e) => setActualDuration(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={complete.isPending} onClick={() => complete.mutate()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
