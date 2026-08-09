import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/fitcore";

export const Route = createFileRoute("/admin/planes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Planes — FITCORE Admin" },
      {
        name: "description",
        content: "Configura los planes de suscripción disponibles para los entrenadores de FITCORE.",
      },
      { property: "og:title", content: "Planes — FITCORE Admin" },
      {
        property: "og:description",
        content: "Configura los planes de suscripción disponibles para los entrenadores de FITCORE.",
      },
    ],
  }),
  component: PlansPage,
});

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  max_clients: number | null;
  max_trainers: number;
  storage_gb: number;
  has_nutrition: boolean;
  has_reports: boolean;
  has_ai: boolean;
  has_white_label: boolean;
  active: boolean;
  sort_order: number;
};

const planSchema = z.object({
  name: z.string().trim().min(2, "Escribe un nombre").max(80),
  slug: z.string().trim().min(2, "Escribe un slug").max(80).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  description: z.string().trim().max(500).optional(),
  monthly_price: z.string().optional(),
  annual_price: z.string().optional(),
  max_clients: z.string().optional(),
  max_trainers: z.string().min(1),
  storage_gb: z.string().min(1),
  sort_order: z.string().min(1),
  has_nutrition: z.boolean(),
  has_reports: z.boolean(),
  has_ai: z.boolean(),
  has_white_label: z.boolean(),
  active: z.boolean(),
});

type PlanForm = z.infer<typeof planSchema>;

function usePlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });
}

function PlansPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePlans();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const upsert = useMutation({
    mutationFn: async (values: PlanForm & { id?: string }) => {
      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        monthly_price: values.monthly_price ? Number(values.monthly_price) : null,
        annual_price: values.annual_price ? Number(values.annual_price) : null,
        max_clients: values.max_clients ? Number(values.max_clients) : null,
        max_trainers: Number(values.max_trainers),
        storage_gb: Number(values.storage_gb),
        sort_order: Number(values.sort_order),
        has_nutrition: values.has_nutrition,
        has_reports: values.has_reports,
        has_ai: values.has_ai,
        has_white_label: values.has_white_label,
        active: values.active,
      };
      if (values.id) {
        const { error } = await supabase.from("subscription_plans").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plan guardado");
      setOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("subscription_plans").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-plans"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan eliminado");
      void queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
    onError: (e: Error) => toast.error("No se pudo eliminar: puede estar en uso por alguna suscripción"),
  });

  const plans = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Planes"
        subtitle={`${plans.length} plan(es) configurados`}
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo plan
          </Button>
        }
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : plans.length === 0 ? (
        <EmptyState icon={Layers} title="Sin planes" description="Crea el primer plan de suscripción." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold uppercase tracking-wide text-neon">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.slug}</p>
                </div>
                <Switch checked={p.active} onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })} />
              </div>
              {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>Mensual: {p.monthly_price ? currency(Number(p.monthly_price)) : "—"}</li>
                <li>Anual: {p.annual_price ? currency(Number(p.annual_price)) : "—"}</li>
                <li>Clientes: {p.max_clients ?? "Ilimitados"}</li>
                <li>Entrenadores: {p.max_trainers}</li>
                <li>Almacenamiento: {p.storage_gb} GB</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.has_nutrition && <Badge variant="outline" className="text-[10px]">Nutrición</Badge>}
                {p.has_reports && <Badge variant="outline" className="text-[10px]">Reportes</Badge>}
                {p.has_ai && <Badge variant="outline" className="text-[10px]">IA</Badge>}
                {p.has_white_label && <Badge variant="outline" className="text-[10px]">Marca blanca</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove.mutate(p.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlanDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        busy={upsert.isPending}
        onSubmit={(values) => upsert.mutate({ ...values, ...(editing?.id ? { id: editing.id } : {}) })}
      />
    </div>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  editing,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Plan | null;
  busy?: boolean;
  onSubmit: (values: PlanForm) => void;
}) {
  const [values, setValues] = useState<PlanForm>(() => ({
    name: editing?.name ?? "",
    slug: editing?.slug ?? "",
    description: editing?.description ?? "",
    monthly_price: editing?.monthly_price ? String(editing.monthly_price) : "",
    annual_price: editing?.annual_price ? String(editing.annual_price) : "",
    max_clients: editing?.max_clients ? String(editing.max_clients) : "",
    max_trainers: editing ? String(editing.max_trainers) : "1",
    storage_gb: editing ? String(editing.storage_gb) : "5",
    sort_order: editing ? String(editing.sort_order) : "0",
    has_nutrition: editing?.has_nutrition ?? false,
    has_reports: editing?.has_reports ?? false,
    has_ai: editing?.has_ai ?? false,
    has_white_label: editing?.has_white_label ?? false,
    active: editing?.active ?? true,
  }));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = planSchema.safeParse(values);
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
          <DialogTitle>{editing ? "Editar plan" : "Nuevo plan"}</DialogTitle>
          <DialogDescription>Define los límites y precios del plan de suscripción.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" value={values.slug} onChange={(e) => set("slug", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={values.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="monthly_price">Precio mensual</Label>
              <Input id="monthly_price" type="number" step="0.01" value={values.monthly_price} onChange={(e) => set("monthly_price", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_price">Precio anual</Label>
              <Input id="annual_price" type="number" step="0.01" value={values.annual_price} onChange={(e) => set("annual_price", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_clients">Máx. clientes (vacío = ilimitado)</Label>
              <Input id="max_clients" type="number" value={values.max_clients} onChange={(e) => set("max_clients", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_trainers">Máx. entrenadores</Label>
              <Input id="max_trainers" type="number" value={values.max_trainers} onChange={(e) => set("max_trainers", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage_gb">Almacenamiento (GB)</Label>
              <Input id="storage_gb" type="number" value={values.storage_gb} onChange={(e) => set("storage_gb", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Orden</Label>
              <Input id="sort_order" type="number" value={values.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label="Nutrición" checked={values.has_nutrition} onChange={(v) => set("has_nutrition", v)} />
            <ToggleRow label="Reportes" checked={values.has_reports} onChange={(v) => set("has_reports", v)} />
            <ToggleRow label="Inteligencia artificial" checked={values.has_ai} onChange={(v) => set("has_ai", v)} />
            <ToggleRow label="Marca blanca" checked={values.has_white_label} onChange={(v) => set("has_white_label", v)} />
            <ToggleRow label="Plan activo" checked={values.active} onChange={(v) => set("active", v)} />
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

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
