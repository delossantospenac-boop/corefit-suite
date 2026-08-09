import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Dumbbell,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/fitcore/primitives";
import { RoutineForm, type RoutineFormValues } from "@/components/fitcore/rutinas/routine-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchClients } from "@/lib/fitcore";
import { useAuth } from "@/lib/auth-context";
import {
  GOALS,
  LEVELS,
  STATUSES,
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  fetchRoutines,
  prettyLabel,
  statusTone,
  updateRoutine,
  type RoutineRow,
} from "@/lib/rutinas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/rutinas/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rutinas — FITCORE" },
      {
        name: "description",
        content: "Crea, organiza y asigna rutinas de entrenamiento a tus clientes.",
      },
      { property: "og:title", content: "Rutinas — FITCORE" },
      {
        property: "og:description",
        content: "Gestiona rutinas, plantillas y asignaciones desde un solo lugar.",
      },
    ],
  }),
  component: RutinasPage,
});

type TabKey = "mias" | "activas" | "plantillas";
const NO_CLIENT = "__none__";
const ALL = "__all__";

function RutinasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("mias");
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [clientFilter, setClientFilter] = useState(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<RoutineRow | null>(null);
  const [assignClient, setAssignClient] = useState<string>(NO_CLIENT);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: fetchRoutines });
  const clientsQuery = useQuery({ queryKey: ["clients", false], queryFn: () => fetchClients(false) });
  const routines = routinesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.full_name])), [clients]);

  const create = useMutation({
    mutationFn: async (values: RoutineFormValues) => {
      if (!user) throw new Error("Sesión no válida");
      return createRoutine(values, user.id);
    },
    onSuccess: (id) => {
      toast.success("Rutina creada");
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["routines"] });
      void navigate({ to: "/app/rutinas/$routineId", params: { routineId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (values: RoutineFormValues) => {
      if (!editing) return;
      await updateRoutine(editing.id, values);
    },
    onSuccess: () => {
      toast.success("Rutina actualizada");
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async ({ id, asTemplate }: { id: string; asTemplate?: boolean }) => {
      if (!user) throw new Error("Sesión no válida");
      return duplicateRoutine(id, user.id, { asTemplate: asTemplate ?? false });
    },
    onSuccess: (_id, vars) => {
      toast.success(vars.asTemplate ? "Guardada como plantilla" : "Rutina duplicada");
      void queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => updateRoutine(id, { status: "archivada", archived: true }),
    onSuccess: () => {
      toast.success("Rutina archivada");
      void queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRoutine(id),
    onSuccess: () => {
      toast.success("Rutina eliminada");
      void queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: async ({ routine, clientId }: { routine: RoutineRow; clientId: string | null }) => {
      if (!user) throw new Error("Sesión no válida");
      if (routine.is_template) {
        await duplicateRoutine(routine.id, user.id, { clientId, asTemplate: false, status: "activa" });
      } else {
        await updateRoutine(routine.id, { client_id: clientId });
      }
    },
    onSuccess: () => {
      toast.success("Rutina asignada");
      setAssignTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return routines.filter((r) => {
      if (tab === "mias" && (r.archived || r.status === "archivada")) return false;
      if (tab === "activas" && r.status !== "activa") return false;
      if (tab === "plantillas" && !r.is_template) return false;
      const matchTerm = !term || r.name.toLowerCase().includes(term);
      const matchGoal = goal === ALL || r.goal === goal;
      const matchLevel = level === ALL || r.level === level;
      const matchStatus = status === ALL || r.status === status;
      const matchClient = clientFilter === ALL || r.client_id === clientFilter;
      return matchTerm && matchGoal && matchLevel && matchStatus && matchClient;
    });
  }, [routines, tab, search, goal, level, status, clientFilter]);

  const activeCount = routines.filter((r) => r.status === "activa").length;
  const templateCount = routines.filter((r) => r.is_template).length;
  const clientsWithRoutine = new Set(routines.filter((r) => r.client_id).map((r) => r.client_id)).size;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rutinas"
        subtitle="Diseña, organiza y asigna planes de entrenamiento"
        action={
          <Button size="lg" className="shadow-neon" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> ➕ Crear rutina
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Rutinas activas" value={activeCount} icon={Dumbbell} tone="neon" />
        <StatCard label="Plantillas" value={templateCount} icon={Star} tone="warning" />
        <StatCard label="Clientes con rutina" value={clientsWithRoutine} icon={Users} tone="success" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="mias">Mis rutinas</TabsTrigger>
          <TabsTrigger value="activas">Rutinas activas</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="card-surface flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="pl-9"
          />
        </div>
        <Select value={goal} onValueChange={setGoal}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Objetivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todo objetivo</SelectItem>
            {GOALS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todo nivel</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todo estado</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {routinesQuery.isLoading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={routines.length === 0 ? "Aún no tienes rutinas" : "Sin resultados"}
          description={
            routines.length === 0
              ? "Crea tu primera rutina para empezar a planificar el entrenamiento."
              : "Prueba con otro término de búsqueda o cambia los filtros."
          }
          action={
            routines.length === 0 ? (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Crear rutina
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <RoutineCard
                routine={r}
                clientName={r.client_id ? clientMap.get(r.client_id) ?? "Cliente" : null}
                onEdit={() => setEditing(r)}
                onDuplicate={() => duplicate.mutate({ id: r.id })}
                onSaveTemplate={() => duplicate.mutate({ id: r.id, asTemplate: true })}
                onAssign={() => {
                  setAssignTarget(r);
                  setAssignClient(r.client_id ?? NO_CLIENT);
                }}
                onArchive={() => archive.mutate(r.id)}
                onDelete={() => {
                  if (confirm(`¿Eliminar la rutina "${r.name}"? Esta acción no se puede deshacer.`)) {
                    remove.mutate(r.id);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <RoutineForm
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Crear rutina"
        clients={clients}
        busy={create.isPending}
        onSubmit={(values) => create.mutate(values)}
      />

      <RoutineForm
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Editar rutina"
        initial={editing ?? undefined}
        clients={clients}
        busy={update.isPending}
        onSubmit={(values) => update.mutate(values)}
      />

      <Dialog open={!!assignTarget} onOpenChange={(v) => !v && setAssignTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar a cliente</DialogTitle>
          </DialogHeader>
          <Select value={assignClient} onValueChange={setAssignClient}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLIENT}>Sin asignar</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={assign.isPending}
              onClick={() =>
                assignTarget &&
                assign.mutate({
                  routine: assignTarget,
                  clientId: assignClient === NO_CLIENT ? null : assignClient,
                })
              }
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoutineCard({
  routine,
  clientName,
  onEdit,
  onDuplicate,
  onSaveTemplate,
  onAssign,
  onArchive,
  onDelete,
}: {
  routine: RoutineRow;
  clientName: string | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onAssign: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="card-surface flex flex-col gap-3 p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-neon">
      <button
        type="button"
        className="min-w-0 text-left"
        onClick={() => navigate({ to: "/app/rutinas/$routineId", params: { routineId: routine.id } })}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{routine.name}</p>
          <Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase", statusTone[routine.status])}>
            {prettyLabel(routine.status)}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {clientName ?? (routine.is_template ? "Plantilla" : "Sin asignar")} · {prettyLabel(routine.goal)} ·{" "}
          {prettyLabel(routine.level)}
        </p>
      </button>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-background/50 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Días/sem</dt>
          <dd className="text-sm font-medium">{routine.days_per_week}</dd>
        </div>
        <div className="rounded-lg bg-background/50 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Semanas</dt>
          <dd className="text-sm font-medium">{routine.weeks}</dd>
        </div>
        <div className="rounded-lg bg-background/50 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Inicio</dt>
          <dd className="text-sm font-medium">{routine.start_date ?? "—"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
        </Button>
        <Button size="sm" variant="secondary" onClick={onDuplicate}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicar
        </Button>
        {!routine.is_template && (
          <Button size="sm" variant="secondary" onClick={onSaveTemplate}>
            <Star className="mr-1.5 h-3.5 w-3.5" /> Como plantilla
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onAssign}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Asignar
        </Button>
        <Button size="sm" variant="ghost" onClick={onArchive}>
          <Archive className="mr-1.5 h-3.5 w-3.5" /> Archivar
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
        </Button>
      </div>
    </div>
  );
}
