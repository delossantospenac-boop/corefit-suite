import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import { EmptyState, ListSkeleton, PageHeader } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { supabase } from "@/integrations/supabase/client";
import { ageFrom, daysSince, formatDate, formatDateTime, statusTone, type ClientRow } from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/clientes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clientes — FITCORE Admin" },
      {
        name: "description",
        content: "Consulta todos los clientes registrados en la plataforma FITCORE y su entrenador asignado.",
      },
      { property: "og:title", content: "Clientes — FITCORE Admin" },
      {
        property: "og:description",
        content: "Consulta todos los clientes registrados en la plataforma FITCORE y su entrenador asignado.",
      },
    ],
  }),
  component: AdminClientsPage,
});

type TrainerLite = { id: string; full_name: string; email: string | null };

function useAdminClients() {
  return useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const [clientsRes, profilesRes] = await Promise.all([
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      return {
        clients: (clientsRes.data ?? []) as ClientRow[],
        profiles: (profilesRes.data ?? []) as TrainerLite[],
      };
    },
  });
}

function AdminClientsPage() {
  const { data, isLoading } = useAdminClients();
  const [search, setSearch] = useState("");
  const [trainerFilter, setTrainerFilter] = useState<string>("todos");
  const [detail, setDetail] = useState<ClientRow | null>(null);

  const trainers = data?.profiles ?? [];
  const trainerMap = useMemo(() => new Map(trainers.map((t) => [t.id, t])), [trainers]);

  const filtered = useMemo(() => {
    const clients = data?.clients ?? [];
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchTerm =
        !term ||
        c.full_name.toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term);
      const matchTrainer = trainerFilter === "todos" || c.trainer_id === trainerFilter;
      return matchTerm && matchTrainer;
    });
  }, [data, search, trainerFilter]);

  return (
    <div className="space-y-5">
      <PageHeader title="Clientes" subtitle={`${data?.clients.length ?? 0} cliente(s) en toda la plataforma`} />

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
        <Select value={trainerFilter} onValueChange={setTrainerFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Entrenador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los entrenadores</SelectItem>
            {trainers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name || t.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin clientes" description="No se encontraron clientes con estos filtros." />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const trainer = trainerMap.get(c.trainer_id);
            const inactive = daysSince(c.last_activity_at);
            return (
              <button
                key={c.id}
                onClick={() => setDetail(c)}
                className="card-surface flex w-full flex-col gap-2 p-3 text-left transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Entrenador: {trainer?.full_name || trainer?.email || "Sin asignar"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-4">
                  <span>Acceso: {c.user_id ? "Sí" : "No"}</span>
                  <span>Actividad: {inactive === null ? "—" : inactive === 0 ? "Hoy" : `${inactive} d`}</span>
                  <Badge variant="outline" className={cn("text-[10px] uppercase", statusTone[c.status])}>
                    {c.status}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.full_name}</DialogTitle>
            <DialogDescription>Información de solo lectura del cliente.</DialogDescription>
          </DialogHeader>
          {detail && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Correo" value={detail.email ?? "—"} />
              <Info label="Teléfono" value={detail.phone ?? "—"} />
              <Info label="Edad" value={ageFrom(detail.birth_date) ? `${ageFrom(detail.birth_date)} años` : "—"} />
              <Info label="Objetivo" value={detail.goal ?? "—"} />
              <Info
                label="Entrenador"
                value={trainerMap.get(detail.trainer_id)?.full_name ?? trainerMap.get(detail.trainer_id)?.email ?? "—"}
              />
              <Info label="Estado" value={detail.status} />
              <Info label="Inicio" value={formatDate(detail.start_date)} />
              <Info label="Última actividad" value={formatDateTime(detail.last_activity_at)} />
              <Info label="Acceso propio" value={detail.user_id ? "Sí" : "No"} />
              <Info label="Archivado" value={detail.archived ? "Sí" : "No"} />
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/50 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
