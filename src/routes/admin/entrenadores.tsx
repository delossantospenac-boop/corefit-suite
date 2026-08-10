import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Copy, History, Pencil, Plus, Search, ShieldOff, ShieldCheck, Trash2, UserCog } from "lucide-react";
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
import { createTrainerAccount, setUserAccess } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { currency, formatDate, formatDateTime } from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/entrenadores")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrenadores — FITCORE Admin" },
      {
        name: "description",
        content: "Gestiona los entrenadores registrados en la plataforma FITCORE: accesos, planes y estado.",
      },
      { property: "og:title", content: "Entrenadores — FITCORE Admin" },
      {
        property: "og:description",
        content: "Gestiona los entrenadores registrados en la plataforma FITCORE: accesos, planes y estado.",
      },
    ],
  }),
  component: TrainersPage,
});

type TrainerProfile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  access_enabled: boolean;
  access_note: string | null;
  active: boolean;
  created_at: string;
};

type Subscription = {
  trainer_id: string;
  status: "activo" | "pendiente" | "vencido" | "cancelado";
  price: number | null;
  billing_cycle: string;
  started_at: string;
  next_billing_at: string | null;
  plan_id: string | null;
};

type Plan = { id: string; name: string; max_clients: number | null };

type ClientRow = { trainer_id: string; last_activity_at: string | null; created_at: string };

type Payment = {
  id: string;
  trainer_id: string;
  plan_id: string | null;
  amount: number;
  billing_cycle: string;
  period_start: string;
  period_end: string | null;
  method: string | null;
  status: "activo" | "pendiente" | "vencido" | "cancelado";
  paid_at: string | null;
};

type EstadoKey = "activo" | "suspendido" | "pendiente" | "inactivo";

const estadoTone: Record<EstadoKey, string> = {
  activo: "border-success/40 bg-success/10 text-success",
  suspendido: "border-destructive/40 bg-destructive/10 text-destructive",
  pendiente: "border-warning/40 bg-warning/10 text-warning",
  inactivo: "border-border bg-muted text-muted-foreground",
};

const estadoLabel: Record<EstadoKey, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  pendiente: "Pendiente",
  inactivo: "Inactivo",
};

function computeEstado(profile: TrainerProfile, sub: Subscription | undefined): EstadoKey {
  if (!profile.access_enabled) return "suspendido";
  if (!sub) return "activo";
  if (sub.status === "pendiente") return "pendiente";
  if (sub.status === "vencido" || sub.status === "cancelado") return "inactivo";
  return "activo";
}

function computeEffectiveAccess(profile: TrainerProfile, sub: Subscription | undefined): boolean {
  if (!profile.access_enabled) return false;
  if (!sub) return true;
  return sub.status === "activo" || sub.status === "pendiente";
}

function useTrainers() {
  return useQuery({
    queryKey: ["admin-trainers"],
    queryFn: async () => {
      const [rolesRes, profilesRes, subsRes, plansRes, clientsRes, paymentsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("role", ["trainer", "gym_admin"]),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, access_enabled, access_note, active, created_at"),
        supabase
          .from("trainer_subscriptions")
          .select("trainer_id, status, price, billing_cycle, started_at, next_billing_at, plan_id"),
        supabase.from("subscription_plans").select("id, name, max_clients"),
        supabase.from("clients").select("trainer_id, last_activity_at, created_at"),
        supabase
          .from("membership_payments")
          .select("id, trainer_id, plan_id, amount, billing_cycle, period_start, period_end, method, status, paid_at")
          .order("created_at", { ascending: false }),
      ]);
      const trainerIds = new Set((rolesRes.data ?? []).map((r) => r.user_id));
      const profiles = ((profilesRes.data ?? []) as TrainerProfile[]).filter((p) => trainerIds.has(p.id));
      return {
        profiles,
        subs: (subsRes.data ?? []) as Subscription[],
        plans: (plansRes.data ?? []) as Plan[],
        clients: (clientsRes.data ?? []) as ClientRow[],
        payments: (paymentsRes.data ?? []) as Payment[],
      };
    },
  });
}

const createSchema = z.object({
  fullName: z.string().trim().min(3, "Escribe el nombre completo").max(120),
  email: z.string().trim().email("Correo no válido").max(255),
  phone: z.string().trim().max(40).optional(),
  password: z.union([z.string().min(8, "Mínimo 8 caracteres").max(72), z.literal("")]).optional(),
});

function TrainersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useTrainers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainerProfile | null>(null);
  const [denyTarget, setDenyTarget] = useState<TrainerProfile | null>(null);
  const [historyTarget, setHistoryTarget] = useState<TrainerProfile | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const createTrainerFn = useServerFn(createTrainerAccount);
  const setAccessFn = useServerFn(setUserAccess);

  const create = useMutation({
    mutationFn: (values: z.infer<typeof createSchema>) =>
      createTrainerFn({
        data: {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone || undefined,
          password: values.password || undefined,
        },
      }),
    onSuccess: (res) => {
      setCreateOpen(false);
      setCreatedCreds({ email: res.email, password: res.password });
      void queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editProfile = useMutation({
    mutationFn: async (values: { id: string; full_name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: values.full_name, phone: values.phone || null })
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrenador actualizado");
      setEditTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const access = useMutation({
    mutationFn: (vars: { userId: string; enabled: boolean; note?: string }) =>
      setAccessFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.enabled ? "Acceso activado" : "Acceso denegado");
      setDenyTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ active: false, access_enabled: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrenador desactivado");
      void queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const profiles = data?.profiles ?? [];
    const subs = data?.subs ?? [];
    const plans = data?.plans ?? [];
    const clients = data?.clients ?? [];
    const term = search.trim().toLowerCase();

    return profiles
      .map((p) => {
        const sub = subs.find((s) => s.trainer_id === p.id);
        const plan = sub ? plans.find((pl) => pl.id === sub.plan_id) : undefined;
        const myClients = clients.filter((c) => c.trainer_id === p.id);
        const lastActivity = myClients.reduce<string | null>((acc, c) => {
          const candidate = c.last_activity_at ?? c.created_at;
          if (!acc || candidate > acc) return candidate;
          return acc;
        }, null);
        const estado = computeEstado(p, sub);
        const effectiveAccess = computeEffectiveAccess(p, sub);
        return { profile: p, sub, plan, clientsUsed: myClients.length, lastActivity, estado, effectiveAccess };
      })
      .filter((r) => {
        const matchTerm =
          !term ||
          r.profile.full_name.toLowerCase().includes(term) ||
          (r.profile.email ?? "").toLowerCase().includes(term);
        const matchStatus = statusFilter === "todos" || r.estado === statusFilter;
        return matchTerm && matchStatus;
      })
      .sort((a, b) => b.profile.created_at.localeCompare(a.profile.created_at));
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Entrenadores"
        subtitle={`${data?.profiles.length ?? 0} entrenador(es) registrados`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Crear entrenador
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="suspendido">Suspendido</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Sin entrenadores"
          description="Crea el primer entrenador de la plataforma."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Crear entrenador
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.profile.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.profile.full_name || "Sin nombre"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.profile.email}</p>
                  {r.profile.access_note && (
                    <p className="mt-1 text-xs text-destructive">Motivo: {r.profile.access_note}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline" className={cn("text-[10px] uppercase", estadoTone[r.estado])}>
                    {estadoLabel[r.estado]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase",
                      r.effectiveAccess
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                    )}
                  >
                    Acceso efectivo: {r.effectiveAccess ? "Sí" : "No"}
                  </Badge>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
                <div className="rounded-lg bg-background/50 py-2">
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Plan</dt>
                  <dd className="text-sm font-medium">{r.plan?.name ?? "Sin plan"}</dd>
                </div>
                <div className="rounded-lg bg-background/50 py-2">
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Inicio</dt>
                  <dd className="text-sm font-medium">{r.sub ? formatDate(r.sub.started_at) : "—"}</dd>
                </div>
                <div className="rounded-lg bg-background/50 py-2">
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Vencimiento</dt>
                  <dd
                    className={cn(
                      "text-sm font-medium",
                      r.sub?.next_billing_at &&
                        r.sub.next_billing_at < new Date().toISOString().slice(0, 10) &&
                        "text-destructive",
                    )}
                  >
                    {r.sub ? formatDate(r.sub.next_billing_at) : "—"}
                  </dd>
                </div>
                <div className="rounded-lg bg-background/50 py-2">
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Clientes</dt>
                  <dd className="text-sm font-medium">
                    {r.clientsUsed} / {r.plan?.max_clients ?? "∞"}
                  </dd>
                </div>
                <div className="rounded-lg bg-background/50 py-2">
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Última actividad</dt>
                  <dd className="text-sm font-medium">{formatDateTime(r.lastActivity)}</dd>
                </div>
              </dl>

              {r.sub?.price != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Precio: {currency(Number(r.sub.price))} / {r.sub.billing_cycle === "anual" ? "año" : "mes"}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditTarget(r.profile)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                {r.profile.access_enabled ? (
                  <Button size="sm" variant="secondary" onClick={() => setDenyTarget(r.profile)}>
                    <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Denegar / Suspender acceso
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => access.mutate({ userId: r.profile.id, enabled: true })}
                    disabled={access.isPending}
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> {r.profile.access_note ? "Reactivar acceso" : "Activar acceso"}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(r.profile)}>
                  <History className="mr-1.5 h-3.5 w-3.5" /> Historial de pagos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deactivate.mutate(r.profile.id)}
                  disabled={deactivate.isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Desactivar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTrainerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        busy={create.isPending}
        onSubmit={(values) => create.mutate(values)}
      />

      <EditTrainerDialog
        target={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        busy={editProfile.isPending}
        onSubmit={(values) => editProfile.mutate(values)}
      />

      <DenyAccessDialog
        target={denyTarget}
        onOpenChange={(v) => !v && setDenyTarget(null)}
        busy={access.isPending}
        onConfirm={(note) =>
          denyTarget &&
          access.mutate({ userId: denyTarget.id, enabled: false, ...(note ? { note } : {}) })
        }

      />

      <CredentialsDialog creds={createdCreds} onOpenChange={(v) => !v && setCreatedCreds(null)} />

      <PaymentHistoryDialog
        target={historyTarget}
        payments={data?.payments ?? []}
        plans={data?.plans ?? []}
        onOpenChange={(v) => !v && setHistoryTarget(null)}
      />
    </div>
  );
}

function CreateTrainerDialog({
  open,
  onOpenChange,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: z.infer<typeof createSchema>) => void;
  busy?: boolean;
}) {
  const [values, setValues] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
    setValues({ fullName: "", email: "", phone: "", password: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear entrenador</DialogTitle>
          <DialogDescription>Se creará una cuenta de acceso para el nuevo entrenador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo *</Label>
            <Input
              id="fullName"
              value={values.fullName}
              onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo *</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña temporal (opcional)</Label>
            <Input
              id="password"
              type="text"
              placeholder="Se generará una si la dejas vacía"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
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
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTrainerDialog({
  target,
  onOpenChange,
  busy,
  onSubmit,
}: {
  target: TrainerProfile | null;
  onOpenChange: (v: boolean) => void;
  busy?: boolean;
  onSubmit: (values: { id: string; full_name: string; phone: string }) => void;
}) {
  const [fullName, setFullName] = useState(target?.full_name ?? "");
  const [phone, setPhone] = useState(target?.phone ?? "");

  if (target && fullName === "" && target.full_name && fullName !== target.full_name) {
    // no-op guard, values are seeded via key below
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        key={target?.id}
      >
        <DialogHeader>
          <DialogTitle>Editar entrenador</DialogTitle>
          <DialogDescription>Actualiza los datos de contacto.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!target) return;
            onSubmit({ id: target.id, full_name: fullName || target.full_name, phone });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre completo</Label>
            <Input
              id="edit-name"
              defaultValue={target?.full_name}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Teléfono</Label>
            <Input
              id="edit-phone"
              defaultValue={target?.phone ?? ""}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
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

function DenyAccessDialog({
  target,
  onOpenChange,
  busy,
  onConfirm,
}: {
  target: TrainerProfile | null;
  onOpenChange: (v: boolean) => void;
  busy?: boolean;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" key={target?.id}>
        <DialogHeader>
          <DialogTitle>Denegar acceso</DialogTitle>
          <DialogDescription>
            {target?.full_name} no podrá iniciar sesión hasta que se reactive su acceso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="deny-note">Motivo (opcional)</Label>
          <Textarea id="deny-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => onConfirm(note || undefined)}
          >
            Denegar acceso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({
  creds,
  onOpenChange,
}: {
  creds: { email: string; password: string } | null;
  onOpenChange: (v: boolean) => void;
}) {
  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  }

  return (
    <Dialog open={!!creds} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrenador creado</DialogTitle>
          <DialogDescription>Comparte estas credenciales de forma segura.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Correo</p>
              <p className="truncate text-sm font-medium">{creds?.email}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => creds && copy(creds.email)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Contraseña temporal</p>
              <p className="truncate text-sm font-medium">{creds?.password}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => creds && copy(creds.password)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
