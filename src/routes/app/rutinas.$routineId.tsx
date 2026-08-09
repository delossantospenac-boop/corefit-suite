import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Copy,
  Dumbbell,
  GripVertical,
  Pencil,
  Plus,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ListSkeleton, PageHeader } from "@/components/fitcore/primitives";
import { ExercisePicker } from "@/components/fitcore/rutinas/exercise-picker";
import { RoutineForm, type RoutineFormValues } from "@/components/fitcore/rutinas/routine-form";
import { SetEditor } from "@/components/fitcore/rutinas/set-editor";
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
import { Textarea } from "@/components/ui/textarea";
import { fetchClients } from "@/lib/fitcore";
import { useAuth } from "@/lib/auth-context";
import {
  WEEKDAYS,
  addDay,
  addExerciseToDay,
  deleteDay,
  deleteRoutineExercise,
  duplicateDay,
  duplicateRoutine,
  duplicateRoutineExercise,
  fetchExerciseLibrary,
  fetchRoutine,
  prettyLabel,
  replacePlannedSets,
  reorderDays,
  reorderExercises,
  statusTone,
  updateDay,
  updateRoutine,
  updateRoutineExercise,
  type ExerciseRow,
  type FullDay,
  type FullExercise,
} from "@/lib/rutinas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/rutinas/$routineId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Constructor de rutina — FITCORE" },
      {
        name: "description",
        content: "Arma días, ejercicios y series de una rutina de entrenamiento.",
      },
      { property: "og:title", content: "Constructor de rutina — FITCORE" },
      { property: "og:description", content: "Organiza días y ejercicios con series planificadas." },
    ],
  }),
  component: RoutineBuilderPage,
});

function RoutineBuilderPage() {
  const { routineId } = useParams({ from: "/app/rutinas/$routineId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [addDayOpen, setAddDayOpen] = useState(false);

  const routineQuery = useQuery({
    queryKey: ["routine", routineId],
    queryFn: () => fetchRoutine(routineId),
  });
  const clientsQuery = useQuery({ queryKey: ["clients", false], queryFn: () => fetchClients(false) });
  const libraryQuery = useQuery({ queryKey: ["exercise-library"], queryFn: fetchExerciseLibrary });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["routine", routineId] });

  const update = useMutation({
    mutationFn: (values: RoutineFormValues) => updateRoutine(routineId, values),
    onSuccess: () => {
      toast.success("Rutina actualizada");
      setEditOpen(false);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (asTemplate?: boolean) => {
      if (!user) throw new Error("Sesión no válida");
      return duplicateRoutine(routineId, user.id, { asTemplate: asTemplate ?? false });
    },
    onSuccess: (id, asTemplate) => {
      toast.success(asTemplate ? "Guardada como plantilla" : "Rutina duplicada");
      void navigate({ to: "/app/rutinas/$routineId", params: { routineId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDay = useMutation({
    mutationFn: async ({ name, weekday }: { name: string; weekday: number | null }) => {
      const dayIndex = routine?.days.length ?? 0;
      const id = await addDay(routineId, dayIndex, name);
      if (weekday !== null) await updateDay(id, { weekday });
    },
    onSuccess: () => {
      toast.success("Día agregado");
      setAddDayOpen(false);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderDaysMut = useMutation({
    mutationFn: (ids: string[]) => reorderDays(ids),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const routine = routineQuery.data;
  const clients = clientsQuery.data ?? [];
  const library = libraryQuery.data ?? [];
  const clientName = useMemo(
    () => clients.find((c) => c.id === routine?.client_id)?.full_name,
    [clients, routine],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDayDragEnd(e: DragEndEvent) {
    if (!routine || !e.over || e.active.id === e.over.id) return;
    const ids = routine.days.map((d) => d.id);
    const oldIndex = ids.indexOf(String(e.active.id));
    const newIndex = ids.indexOf(String(e.over.id));
    const next = arrayMove(ids, oldIndex, newIndex);
    reorderDaysMut.mutate(next);
  }

  if (routineQuery.isLoading) {
    return (
      <div className="space-y-5">
        <ListSkeleton rows={1} />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (!routine) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Rutina no encontrada"
        description="Puede que haya sido eliminada."
        action={
          <Button asChild>
            <Link to="/app/rutinas">Volver a rutinas</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: "/app/rutinas" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver a rutinas
      </Button>

      <PageHeader
        title={routine.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] uppercase", statusTone[routine.status])}>
              {prettyLabel(routine.status)}
            </Badge>
            <span>{clientName ?? (routine.is_template ? "Plantilla" : "Sin asignar")}</span>
            <span>· {prettyLabel(routine.goal)}</span>
            <span>· {prettyLabel(routine.level)}</span>
            <span>· {routine.days_per_week} días/sem</span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" /> Editar
            </Button>
            <Button variant="secondary" onClick={() => duplicate.mutate(undefined)}>
              <Copy className="mr-1.5 h-4 w-4" /> Duplicar
            </Button>
            {!routine.is_template && (
              <Button variant="secondary" onClick={() => duplicate.mutate(true)}>
                <Star className="mr-1.5 h-4 w-4" /> Guardar como plantilla
              </Button>
            )}
            <Button onClick={() => setAddDayOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Agregar día
            </Button>
          </div>
        }
      />

      {routine.days.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin días todavía"
          description="Agrega el primer día de entrenamiento para empezar a construir la rutina."
          action={
            <Button onClick={() => setAddDayOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Agregar día
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDayDragEnd}>
          <SortableContext items={routine.days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {routine.days.map((day) => (
                <DayCard key={day.id} day={day} routineId={routineId} library={library} onChanged={invalidate} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <RoutineForm
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar rutina"
        initial={routine}
        clients={clients}
        busy={update.isPending}
        onSubmit={(values) => update.mutate(values)}
      />

      <AddDayDialog
        open={addDayOpen}
        onOpenChange={setAddDayOpen}
        busy={createDay.isPending}
        onSubmit={(values) => createDay.mutate(values)}
      />
    </div>
  );
}

function AddDayDialog({
  open,
  onOpenChange,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy?: boolean;
  onSubmit: (values: { name: string; weekday: number | null }) => void;
}) {
  const [name, setName] = useState("");
  const [weekday, setWeekday] = useState<string>("__none__");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setWeekday("__none__");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar día</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="dname">Nombre del día</Label>
            <Input
              id="dname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Empuje, Pierna, Full body…"
            />
          </div>
          <div>
            <Label>Día de la semana (opcional)</Label>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {WEEKDAYS.map((w, i) => (
                  <SelectItem key={w} value={String(i)}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={() =>
              onSubmit({ name: name.trim(), weekday: weekday === "__none__" ? null : Number(weekday) })
            }
          >
            {busy ? "Guardando…" : "Agregar día"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DayCard({
  day,
  routineId,
  library,
  onChanged,
}: {
  day: FullDay;
  routineId: string;
  library: ExerciseRow[];
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(day.name);
  const [description, setDescription] = useState(day.description ?? "");
  const [estimatedMin, setEstimatedMin] = useState(day.estimated_min ? String(day.estimated_min) : "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [configItem, setConfigItem] = useState<FullExercise | null>(null);

  const editDay = useMutation({
    mutationFn: () =>
      updateDay(day.id, {
        name: name.trim() || day.name,
        description: description || null,
        estimated_min: estimatedMin ? Number(estimatedMin) : null,
      }),
    onSuccess: () => {
      toast.success("Día actualizado");
      setEditOpen(false);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDay = useMutation({
    mutationFn: () => deleteDay(day.id),
    onSuccess: () => {
      toast.success("Día eliminado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupDay = useMutation({
    mutationFn: () => duplicateDay(day.id),
    onSuccess: () => {
      toast.success("Día duplicado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addEx = useMutation({
    mutationFn: (exercise: ExerciseRow) => addExerciseToDay(day.id, exercise.id, day.exercises.length),
    onSuccess: () => {
      toast.success("Ejercicio agregado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEx = useMutation({
    mutationFn: (id: string) => deleteRoutineExercise(id),
    onSuccess: () => {
      toast.success("Ejercicio eliminado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupEx = useMutation({
    mutationFn: (id: string) => duplicateRoutineExercise(id),
    onSuccess: () => {
      toast.success("Ejercicio duplicado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderEx = useMutation({
    mutationFn: (ids: string[]) => reorderExercises(ids),
    onSuccess: () => onChanged(),
    onError: (e: Error) => toast.error(e.message),
  });

  const saveConfig = useMutation({
    mutationFn: async ({
      config,
      sets,
    }: {
      config: Parameters<NonNullable<React.ComponentProps<typeof SetEditor>["onSave"]>>[0];
      sets: Parameters<NonNullable<React.ComponentProps<typeof SetEditor>["onSave"]>>[1];
    }) => {
      if (!configItem) return;
      await updateRoutineExercise(configItem.id, { ...config, sets: sets.length });
      await replacePlannedSets(
        configItem.id,
        sets.map((s) => ({ ...s })),
      );
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      setConfigItem(null);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleExDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = day.exercises.map((ex) => ex.id);
    const oldIndex = ids.indexOf(String(e.active.id));
    const newIndex = ids.indexOf(String(e.over.id));
    reorderEx.mutate(arrayMove(ids, oldIndex, newIndex));
  }

  const totalSets = day.exercises.reduce((acc, ex) => acc + (ex.plannedSets.length || ex.sets || 0), 0);
  const volume = day.exercises.reduce((acc, ex) => {
    const sets = ex.plannedSets.length > 0 ? ex.plannedSets : [];
    return acc + sets.reduce((a, s) => a + (s.weight ?? 0) * (Number(s.reps) || 0), 0);
  }, 0);

  return (
    <div ref={setNodeRef} style={style} className="card-surface p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Reordenar día"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {day.name}
                {day.weekday !== null && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{WEEKDAYS[day.weekday]}</span>
                )}
              </p>
              {day.description && <p className="mt-0.5 text-xs text-muted-foreground">{day.description}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dupDay.mutate()}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`¿Eliminar el día "${day.name}"?`)) removeDay.mutate();
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:max-w-sm">
            <div className="rounded-lg bg-background/50 py-2">
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Ejercicios</dt>
              <dd className="text-sm font-medium">{day.exercises.length}</dd>
            </div>
            <div className="rounded-lg bg-background/50 py-2">
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Series</dt>
              <dd className="text-sm font-medium">{totalSets}</dd>
            </div>
            <div className="rounded-lg bg-background/50 py-2">
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Vol. est.</dt>
              <dd className="text-sm font-medium">{volume ? `${Math.round(volume)} kg` : "—"}</dd>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {day.exercises.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                Sin ejercicios en este día.
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExDragEnd}>
                <SortableContext items={day.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  {day.exercises.map((ex) => (
                    <ExerciseRowItem
                      key={ex.id}
                      exercise={ex}
                      onConfigure={() => setConfigItem(ex)}
                      onDuplicate={() => dupEx.mutate(ex.id)}
                      onDelete={() => removeEx.mutate(ex.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar ejercicio
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar día</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edname">Nombre</Label>
              <Input id="edname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="eddesc">Descripción</Label>
              <Textarea id="eddesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label htmlFor="edmin">Minutos estimados</Label>
              <Input
                id="edmin"
                type="number"
                value={estimatedMin}
                onChange={(e) => setEstimatedMin(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={editDay.isPending} onClick={() => editDay.mutate()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        library={library}
        onPick={(exercise) => addEx.mutate(exercise)}
      />

      {configItem && (
        <SetEditor
          open={!!configItem}
          onOpenChange={(v) => !v && setConfigItem(null)}
          item={configItem}
          busy={saveConfig.isPending}
          onSave={(config, sets) => saveConfig.mutate({ config, sets })}
        />
      )}
    </div>
  );
}

function ExerciseRowItem({
  exercise,
  onConfigure,
  onDuplicate,
  onDelete,
}: {
  exercise: FullExercise;
  onConfigure: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface p-2.5"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Reordenar ejercicio"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{exercise.exercise?.name ?? "Ejercicio"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {exercise.sets ?? exercise.plannedSets.length} series · {exercise.reps ?? "—"} reps
          {exercise.weight ? ` · ${exercise.weight} kg` : ""}
          {exercise.rest_seconds ? ` · ${exercise.rest_seconds}s desc.` : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] uppercase">
        {prettyLabel(exercise.set_type)}
      </Badge>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={onConfigure} aria-label="Configurar series">
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDuplicate} aria-label="Duplicar ejercicio">
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Eliminar ejercicio"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
