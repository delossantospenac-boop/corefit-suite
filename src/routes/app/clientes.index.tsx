import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Archive, KeyRound, Plus, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";


import { EmptyState, ListSkeleton, PageHeader } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ageFrom,
  daysSince,
  fetchClients,
  formatDate,
  statusTone,
  type ClientRow,
} from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/clientes/")({
  ssr: false,
  component: ClientsPage,
});

const clientSchema = z.object({
  full_name: z.string().trim().min(3, "Escribe el nombre completo").max(120),
  email: z.union([z.string().trim().email("Correo no válido").max(255), z.literal("")]),
  phone: z.string().trim().max(40).optional(),
  sex: z.string().optional(),
  birth_date: z.string().optional(),
  height_cm: z.string().optional(),
  weight_kg: z.string().optional(),
  goal: z.string().trim().max(200).optional(),
  status: z.enum(["activo", "inactivo", "pausado", "finalizado"]),
  notes: z.string().trim().max(1000).optional(),
});

type SortKey = "recientes" | "nombre" | "actividad";

function ClientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [sort, setSort] = useState<SortKey>("recientes");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["clients", showArchived],
    queryFn: () => fetchClients(showArchived),
  });

  const create = useMutation({
    mutationFn: async (values: z.infer<typeof clientSchema>) => {
      if (!user) throw new Error("Sesión no válida");
      const { error } = await supabase.from("clients").insert({
        trainer_id: user.id,
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        sex: values.sex || null,
        birth_date: values.birth_date || null,
        height_cm: values.height_cm ? Number(values.height_cm) : null,
        weight_kg: values.weight_kg ? Number(values.weight_kg) : null,
        goal: values.goal || null,
        status: values.status,
        notes: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente creado");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clients = clientsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = clients.filter((c) => {
      const matchTerm =
        !term ||
        c.full_name.toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term);
      const matchStatus = status === "todos" || c.status === status;
      return matchTerm && matchStatus;
    });
    list = [...list].sort((a, b) => {
      if (sort === "nombre") return a.full_name.localeCompare(b.full_name);
      if (sort === "actividad")
        return (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? "");
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [clients, search, status, sort]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} cliente(s) en tu cartera`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="card-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recientes">Más recientes</SelectItem>
            <SelectItem value="nombre">Nombre A-Z</SelectItem>
            <SelectItem value="actividad">Última actividad</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? "default" : "secondary"}
          onClick={() => setShowArchived((v) => !v)}
          className="shrink-0"
        >
          <Archive className="mr-2 h-4 w-4" />
          {showArchived ? "Ocultar archivados" : "Ver archivados"}
        </Button>
      </div>

      {clientsQuery.isLoading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? "Aún no tienes clientes" : "Sin resultados"}
          description={
            clients.length === 0
              ? "Crea tu primer cliente para empezar a construir su plan."
              : "Prueba con otro término de búsqueda o cambia los filtros."
          }
          action={
            clients.length === 0 ? (
              <Button onClick={() => setOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Crear cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <ClientCard client={c} />
            </li>
          ))}
        </ul>
      )}

      <ClientDialog
        open={open}
        onOpenChange={setOpen}
        busy={create.isPending}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}

function ClientCard({ client }: { client: ClientRow }) {
  const age = ageFrom(client.birth_date);
  const inactive = daysSince(client.last_activity_at);

  return (
    <Link
      to="/app/clientes/$clientId"
      params={{ clientId: client.id }}
      className="card-surface block p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-neon"
    >
      <div className="flex min-w-0 items-center gap-3">
        {client.photo_url ? (
          <img
            src={client.photo_url}
            alt={client.full_name}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-neon">
            {client.full_name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{client.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[age ? `${age} años` : null, client.goal].filter(Boolean).join(" · ") || "Sin objetivo"}
          </p>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase", statusTone[client.status])}>
          {client.status}
        </Badge>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-background/50 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Peso</dt>
          <dd className="text-sm font-medium">{client.weight_kg ? `${client.weight_kg} kg` : "—"}</dd>
        </div>
        <div className="rounded-lg bg-background/50 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Inicio</dt>
          <dd className="text-sm font-medium">{formatDate(client.start_date)}</dd>
        </div>
        <div className="rounded-lg bg-background/50 py-2">
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Actividad</dt>
          <dd className="text-sm font-medium">
            {inactive === null ? "—" : inactive === 0 ? "Hoy" : `${inactive} d`}
          </dd>
        </div>
      </dl>
    </Link>
  );
}

export function ClientDialog({
  open,
  onOpenChange,
  onSubmit,
  busy,
  initial,
  title = "Nuevo cliente",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: z.infer<typeof clientSchema>) => void;
  busy?: boolean;
  initial?: Partial<ClientRow>;
  title?: string;
}) {
  const [values, setValues] = useState({
    full_name: initial?.full_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    sex: initial?.sex ?? "",
    birth_date: initial?.birth_date ?? "",
    height_cm: initial?.height_cm ? String(initial.height_cm) : "",
    weight_kg: initial?.weight_kg ? String(initial.weight_kg) : "",
    goal: initial?.goal ?? "",
    status: (initial?.status ?? "activo") as ClientRow["status"],
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = clientSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Los datos que registres alimentan las evaluaciones y el progreso del cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input
              id="full_name"
              value={values.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={values.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={values.sex} onValueChange={(v) => set("sex", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="height_cm">Altura (cm)</Label>
              <Input
                id="height_cm"
                type="number"
                step="0.1"
                value={values.height_cm}
                onChange={(e) => set("height_cm", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.1"
                value={values.weight_kg}
                onChange={(e) => set("weight_kg", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo</Label>
            <Input
              id="goal"
              value={values.goal}
              onChange={(e) => set("goal", e.target.value)}
              placeholder="Perder grasa, ganar fuerza…"
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={values.status}
              onValueChange={(v) => set("status", v as ClientRow["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
