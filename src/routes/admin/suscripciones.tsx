import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CreditCard, Plus, TrendingUp, AlertTriangle, Clock, XCircle, Receipt, ShieldAlert } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { currency, formatDate, formatDateTime } from "@/lib/fitcore";
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

type Payment = {
  id: string;
  trainer_id: string;
  plan_id: string | null;
  subscription_id: string | null;
  amount: number;
  currency: string;
  billing_cycle: string;
  period_start: string;
  period_end: string | null;
  method: string | null;
  provider: string | null;
  status: "activo" | "pendiente" | "vencido" | "cancelado";
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

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

const paymentSchema = z.object({
  trainer_id: z.string().uuid("Selecciona un entrenador"),
  plan_id: z.string().uuid("Selecciona un plan").optional().or(z.literal("")),
  amount: z.string().min(1, "Indica el importe"),
  billing_cycle: z.enum(["monthly", "annual"]),
  period_start: z.string().min(1, "Indica el inicio del periodo"),
  period_end: z.string().min(1, "Indica el fin del periodo"),
  method: z.string().trim().max(60).optional(),
  status: z.enum(["activo", "pendiente", "vencido", "cancelado"]),
  paid_at: z.string().optional(),
  notes: z.string().trim().max(300).optional(),
});

function useSubscriptionsData() {
  return useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const [subsRes, trainersRes, rolesRes, plansRes, paymentsRes] = await Promise.all([
        supabase.from("trainer_subscriptions").select("*").order("started_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("user_roles").select("user_id, role").in("role", ["trainer", "gym_admin"]),
        supabase.from("subscription_plans").select("id, name, monthly_price, annual_price"),
        supabase.from("membership_payments").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const trainerIds = new Set((rolesRes.data ?? []).map((r) => r.user_id));
      return {
        subs: (subsRes.data ?? []) as Subscription[],
        trainers: ((trainersRes.data ?? []) as Trainer[]).filter((t) => trainerIds.has(t.id)),
        plans: (plansRes.data ?? []) as Plan[],
        payments: (paymentsRes.data ?? []) as Payment[],
      };
    },
  });
}

function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSubscriptionsData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const subs = data?.subs ?? [];
  const trainers = data?.trainers ?? [];
  const plans = data?.plans ?? [];
  const payments = data?.payments ?? [];
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
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const paymentsThisMonth = payments.filter((p) => (p.paid_at ?? p.created_at) >= monthStart && p.status === "activo");
    const paymentsTotal = paymentsThisMonth.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    const overdue = subs.filter((s) => s.next_billing_at && s.next_billing_at < now.toISOString().slice(0, 10));
    return {
      mrr,
      active: active.length,
      pending: pending.length,
      expired: expired.length,
      paymentsThisMonth: paymentsThisMonth.length,
      paymentsTotal,
      overdue: overdue.length,
    };
  }, [subs, payments]);

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

  const registerPayment = useMutation({
    mutationFn: async (values: z.infer<typeof paymentSchema>) => {
      const existingSub = subs.find((s) => s.trainer_id === values.trainer_id);

      const { error: payErr } = await supabase.from("membership_payments").insert({
        trainer_id: values.trainer_id,
        plan_id: values.plan_id || null,
        subscription_id: existingSub?.id ?? null,
        amount: Number(values.amount),
        billing_cycle: values.billing_cycle,
        period_start: values.period_start,
        period_end: values.period_end,
        method: values.method || null,
        status: values.status,
        paid_at: values.paid_at || new Date().toISOString(),
        notes: values.notes || null,
      });
      if (payErr) throw payErr;

      if (existingSub) {
        const { error: subErr } = await supabase
          .from("trainer_subscriptions")
          .update({
            status: "activo",
            plan_id: values.plan_id || existingSub.plan_id,
            next_billing_at: values.period_end,
            price: Number(values.amount),
            billing_cycle: values.billing_cycle === "annual" ? "anual" : "mensual",
          })
          .eq("id", existingSub.id);
        if (subErr) throw subErr;
      } else {
        const { error: subErr } = await supabase.from("trainer_subscriptions").insert({
          trainer_id: values.trainer_id,
          plan_id: values.plan_id || null,
          status: "activo",
          billing_cycle: values.billing_cycle === "annual" ? "anual" : "mensual",
          price: Number(values.amount),
          started_at: values.period_start,
          next_billing_at: values.period_end,
        });
        if (subErr) throw subErr;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ access_enabled: true, access_note: null })
        .eq("id", values.trainer_id);
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      toast.success("Pago registrado y suscripción actualizada");
      setPaymentOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-trainers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markOverdue = useMutation({
    mutationFn: async () => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const overdueIds = subs
        .filter((s) => s.status === "activo" && s.next_billing_at && s.next_billing_at < todayISO)
        .map((s) => s.id);
      if (overdueIds.length === 0) return 0;
      const { error } = await supabase.from("trainer_subscriptions").update({ status: "vencido" }).in("id", overdueIds);
      if (error) throw error;
      return overdueIds.length;
    },
    onSuccess: (count) => {
      toast.success(count ? `${count} suscripción(es) marcadas como vencidas` : "No hay suscripciones vencidas");
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => markOverdue.mutate()} disabled={markOverdue.isPending}>
              <ShieldAlert className="mr-2 h-4 w-4" /> Marcar vencidas
            </Button>
            <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
              <Receipt className="mr-2 h-4 w-4" /> Registrar pago
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva suscripción
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR" value={currency(metrics.mrr)} icon={TrendingUp} loading={isLoading} />
        <StatCard
          label="Pagos del mes"
          value={`${metrics.paymentsThisMonth} · ${currency(metrics.paymentsTotal)}`}
          icon={Receipt}
          tone="success"
          loading={isLoading}
        />
        <StatCard label="Suscripciones vencidas" value={metrics.overdue} icon={XCircle} tone="destructive" loading={isLoading} />
        <StatCard label="Pendientes" value={metrics.pending} icon={Clock} tone="warning" loading={isLoading} />
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
            const isOverdue = !!s.next_billing_at && s.next_billing_at < new Date().toISOString().slice(0, 10);
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
                  <span className={cn(isOverdue && "font-medium text-destructive")}>
                    Próx. cobro: {formatDate(s.next_billing_at)}
                  </span>
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

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Pagos de membresía</h3>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : payments.length === 0 ? (
          <EmptyState icon={Receipt} title="Sin pagos" description="Aún no se han registrado pagos de membresía." />
        ) : (
          <div className="space-y-2">
            {payments.map((p) => {
              const trainer = trainerMap.get(p.trainer_id);
              const plan = p.plan_id ? planMap.get(p.plan_id) : undefined;
              return (
                <div key={p.id} className="card-surface flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{trainer?.full_name || trainer?.email || "Entrenador"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {plan?.name ?? "Sin plan"} · {p.billing_cycle === "annual" ? "Anual" : "Mensual"} ·{" "}
                      {formatDate(p.period_start)} – {formatDate(p.period_end)} · {p.method ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{currency(Number(p.amount ?? 0))}</span>
                    <Badge variant="outline" className={cn("text-[10px] uppercase", statusTone[p.status])}>
                      {p.status}
                    </Badge>
                    <span className="text-muted-foreground">{formatDateTime(p.paid_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
        onSubmit={(values) => upsert.mutate({ ...values, ...(editing?.id ? { id: editing.id } : {}) })}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        trainers={trainers}
        plans={plans}
        busy={registerPayment.isPending}
        onSubmit={(values) => registerPayment.mutate(values)}
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

function PaymentDialog({
  open,
  onOpenChange,
  trainers,
  plans,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainers: Trainer[];
  plans: Plan[];
  busy?: boolean;
  onSubmit: (values: z.infer<typeof paymentSchema>) => void;
}) {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [values, setValues] = useState({
    trainer_id: "",
    plan_id: "",
    amount: "",
    billing_cycle: "monthly" as "monthly" | "annual",
    period_start: today.toISOString().slice(0, 10),
    period_end: nextMonth.toISOString().slice(0, 10),
    method: "",
    status: "activo" as Payment["status"],
    paid_at: today.toISOString().slice(0, 10),
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = paymentSchema.safeParse(values);
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
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Registra un pago de membresía y actualiza la suscripción del entrenador.
          </DialogDescription>
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
                <SelectValue placeholder="Selecciona (opcional)" />
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
              <Label htmlFor="amount">Importe</Label>
              <Input id="amount" type="number" step="0.01" value={values.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ciclo</Label>
              <Select value={values.billing_cycle} onValueChange={(v) => set("billing_cycle", v as "monthly" | "annual")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_start">Inicio de periodo</Label>
              <Input id="period_start" type="date" value={values.period_start} onChange={(e) => set("period_start", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">Fin de periodo</Label>
              <Input id="period_end" type="date" value={values.period_end} onChange={(e) => set("period_end", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <Input
                id="method"
                placeholder="Transferencia, tarjeta..."
                value={values.method}
                onChange={(e) => set("method", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_at">Fecha de cobro</Label>
              <Input id="paid_at" type="date" value={values.paid_at} onChange={(e) => set("paid_at", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as Payment["status"])}>
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={300} />
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
              Registrar pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
