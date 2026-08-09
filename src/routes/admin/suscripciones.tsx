import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CreditCard, Plus, TrendingUp, AlertTriangle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/fitcore/primitives";
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
import { supabase } from "@/integrations/supabase/client";
import { currency, formatDate } from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/suscripciones")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Suscripciones — FITCORE Admin" },
      {
        name: "description",
        content: "Administra las suscripciones de los entrenadores: planes, ciclos de facturación y estado de pago.",
      },
      { property: "og:title", content: "Suscripciones — FITCORE Admin" },
      {
        property: "og:description",
        content: "Administra las suscripciones de los entrenadores: planes, ciclos de facturación y estado de pago.",
      },
    ],
  }),
  component: SubscriptionsPage,
});

type Subscription = {
  id: string;
  trainer_id: string;
  status: "activo" | "pendiente" | "vencido" | "cancelado";
  price: number | null;
  billing_cycle: string;
  started_at: string;
  next_billing_at: string | null;
  plan_id: string | null;
};

type Trainer = { id: string; full_name: string; email: string | null };
type Plan = { id: string; name: string; monthly_price: number | null; annual_price: number | null };

const statusTone: Record<Subscription["status"], string> = {
  activo: "border-success/40 bg-success/10 text-success",
  pendiente: "border-warning/40 bg-warning/10 text-warning",
  vencido: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelado: "border-border bg-muted text-muted-foreground",
};

const formSchema = z.object({
  trainer_id: z.string().uuid("Selecciona un entrenador"),
  plan_id: z.string().uuid("Selecciona un plan"),
  billing_cycle: z.enum(["mensual", "anual"]),
  price: z.string().min(1, "Indica el precio"),
  started_at: z.string().min(1, "Indica la fecha de inicio"),
  next_billing_at: z.string().optional(),
  status: z.enum(["activo", "pendiente", "vencido", "cancelado"]),
});

function useSubscriptionsData() {
  return useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const [subsRes, trainersRes, rolesRes, plansRes] = await Promise.all([
        supabase.from("trainer_subscriptions").select("*").order("started_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("user_roles").select("user_id, role").in("role", ["trainer", "gym_admin"]),
        supabase.from("subscription_plans").select("id, name, monthly_price, annual_price"),
      ]);
      const trainerIds = new Set((rolesRes.data ?? []).map((r) => r.user_id));
      return {
        subs: (subsRes.data ?? []) as Subscription[],
        trainers: ((trainersRes.data ?? []) as Trainer[]).filter((t) => trainerIds.has(t.id)),
        plans: (plansRes.data ?? []) as Plan[],
      };
    },
  });
}

function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSubscriptionsData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const subs = data?.subs ?? [];
  const trainers = data?.trainers ?? [];
  const plans = data?.plans ?? [];
  const trainerMap = useMemo(() => new Map(trainers.map((t) => [t.id, t])), [trainers]);
  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const metrics = useMemo(() => {
    const active = subs.filter((s) => s.status === "activo");
    const pending = subs.filter((s) => s.status === "pendiente");
    const expired = subs.filter((s) => s.status === "vencido" || s.status === "cancelado");
    const mrr = active.reduce((acc, s) => {
      const price = Number(s.price ?? 0);
      return acc + (s.billing_cycle === "anual" ? price / 12 : price);
    }, 0);
    return { mrr, active: active.length, pending: pending.length, expired: expired.length };
  }, [subs]);

  const upsert = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema> & { id?: string }) => {
      const payload = {
        trainer_id: values.trainer_id,
        plan_id: values.plan_id,
        billing_cycle: values.billing_cycle,
        price: Number(values.price),
        started_at: values.started_at,
        next_billing_at: values.next_billing_at || null,
        status: values.status,
      };
      if (values.id) {
        const { error } = await supabase.from("trainer_subscriptions").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainer_subscriptions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Suscripción guardada");
      setOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quickStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Subscription["status"] }) => {
      const { error } = await supabase.from("trainer_subscriptions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      void queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suscripciones"
        subtitle="Facturación de entrenadores"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nueva suscripción
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR" value={currency(metrics.mrr)} icon={TrendingUp} loading={isLoading} />
        <StatCard label="Activas" value={metrics.active} icon={CreditCard} tone="success" loading={isLoading} />
        <StatCard label="Pendientes" value={metrics.pending} icon={Clock} tone="warning" loading={isLoading} />
        <StatCard label="Vencidas/canceladas" value={metrics.expired} icon={XCircle} tone="destructive" loading={isLoading} />
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : subs.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Sin suscripciones" description="Aún no hay suscripciones registradas." />
      ) : (
        <div className="space-y-2">
          {subs.map((s) => {
            const trainer = trainerMap.get(s.trainer_id);
            const plan = s.plan_id ? planMap.get(s.plan_id) : undefined;
            return (
              <div key={s.id} className="card-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{trainer?.full_name || trainer?.email || "Entrenador"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {plan?.name ?? "Sin plan"} · {s.billing_cycle === "anual" ? "Anual" : "Mensual"} ·{" "}
                    {currency(Number(s.price ?? 0))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Inicio: {formatDate(s.started_at)}</span>
                  <span>Próx. cobro: {formatDate(s.next_billing_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px] uppercase", statusTone[s.status])}>
                    {s.status}
                  </Badge>
                  <Select
                    value={s.status}
                    onValueChange={(v) => quickStatus.mutate({ id: s.id, status: v as Subscription["status"] })}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubscriptionDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        trainers={trainers}
        plans={plans}
        editing={editing}
        busy={upsert.isPending}
        onSubmit={(values) => upsert.mutate({ ...values, id: editing?.id })}
      />
    </div>
  );
}

function SubscriptionDialog({
  open,
  onOpenChange,
  trainers,
  plans,
  editing,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainers: Trainer[];
  plans: Plan[];
  editing: Subscription | null;
  busy?: boolean;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
}) {
  const [values, setValues] = useState(() => ({
    trainer_id: editing?.trainer_id ?? "",
    plan_id: editing?.plan_id ?? "",
    billing_cycle: (editing?.billing_cycle as "mensual" | "anual") ?? "mensual",
    price: editing?.price ? String(editing.price) : "",
    started_at: editing?.started_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    next_billing_at: editing?.next_billing_at?.slice(0, 10) ?? "",
    status: editing?.status ?? "activo",
  }));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" key={editing?.id ?? "new"}>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle>
          <DialogDescription>Define el plan y ciclo de facturación del entrenador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Entrenador</Label>
            <Select value={values.trainer_id} onValueChange={(v) => set("trainer_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {trainers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name || t.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={values.plan_id} onValueChange={(v) => set("plan_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ciclo de facturación</Label>
              <Select value={values.billing_cycle} onValueChange={(v) => set("billing_cycle", v as "mensual" | "anual")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input id="price" type="number" step="0.01" value={values.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="started_at">Fecha de inicio</Label>
              <Input id="started_at" type="date" value={values.started_at} onChange={(e) => set("started_at", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_billing_at">Próxima facturación</Label>
              <Input
                id="next_billing_at"
                type="date"
                value={values.next_billing_at}
                onChange={(e) => set("next_billing_at", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as Subscription["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
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
