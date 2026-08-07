import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Archive, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AssessmentsTab, ProgressTab } from "@/components/fitcore/assessments";
import { ChatPanel } from "@/components/fitcore/chat-panel";
import {
  CheckInsTab,
  ClientAgendaTab,
  ClientPaymentsTab,
  ClientRoutinesTab,
  HabitsTab,
  NutritionTab,
  PhotosTab,
  StrengthTab,
  WorkoutLogsTab,
} from "@/components/fitcore/client-tabs";
import { EmptyState, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { ClientDialog } from "@/routes/app/clientes.index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ageFrom, fetchClient, formatDate, statusTone } from "@/lib/fitcore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/clientes/$clientId")({
  ssr: false,
  component: ClientProfile,
});

const TABS = [
  "resumen",
  "evaluaciones",
  "progreso",
  "fotos",
  "rutinas",
  "entrenamientos",
  "fuerza",
  "nutricion",
  "habitos",
  "checkins",
  "chat",
  "agenda",
  "pagos",
] as const;

const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  resumen: "Resumen",
  evaluaciones: "Evaluaciones",
  progreso: "Progreso",
  fotos: "Fotos",
  rutinas: "Rutinas",
  entrenamientos: "Entrenamientos",
  fuerza: "Fuerza",
  nutricion: "Nutrición",
  habitos: "Hábitos",
  checkins: "Check-ins",
  chat: "Chat",
  agenda: "Agenda",
  pagos: "Pagos",
};

function ClientProfile() {
  const { clientId } = Route.useParams();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClient(clientId),
  });

  const update = useMutation({
    mutationFn: async (values: {
      full_name: string;
      email: string;
      phone?: string | undefined;
      sex?: string | undefined;
      birth_date?: string | undefined;
      height_cm?: string | undefined;
      weight_kg?: string | undefined;
      goal?: string | undefined;
      status: "activo" | "inactivo" | "pausado" | "finalizado";
      notes?: string | undefined;
    }) => {
      const { error } = await supabase
        .from("clients")
        .update({
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
        })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente actualizado");
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clients")
        .update({ archived: !client?.archived })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(client?.archived ? "Cliente restaurado" : "Cliente archivado");
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando perfil…</p>;
  }
  if (!client) {
    return <EmptyState title="Cliente no encontrado" description="Puede haber sido eliminado." />;
  }

  const age = ageFrom(client.birth_date);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/clientes">
          <ArrowLeft className="mr-2 h-4 w-4" /> Clientes
        </Link>
      </Button>

      <PageHeader
        title={client.full_name}
        subtitle={`${age ? `${age} años · ` : ""}${client.goal ?? "Sin objetivo definido"}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => archive.mutate()}>
              <Archive className="mr-2 h-4 w-4" />
              {client.archived ? "Restaurar" : "Archivar"}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="resumen">
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs uppercase tracking-wide">
                {TAB_LABEL[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="resumen" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Estado", client.status],
              ["Peso actual", client.weight_kg ? `${client.weight_kg} kg` : "—"],
              ["Altura", client.height_cm ? `${client.height_cm} cm` : "—"],
              ["Inicio", formatDate(client.start_date)],
            ].map(([label, value]) => (
              <div key={String(label)} className="card-surface p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
              </div>
            ))}
          </div>
          <SectionCard title="Datos del cliente">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Correo", client.email ?? "—"],
                ["Teléfono", client.phone ?? "—"],
                ["Sexo", client.sex ?? "—"],
                ["Última actividad", formatDate(client.last_activity_at)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 border-b border-border/50 pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {client.notes && <p className="mt-4 text-sm text-muted-foreground">{client.notes}</p>}
            <Badge
              variant="outline"
              className={cn("mt-4 text-[10px] uppercase", statusTone[client.status])}
            >
              {client.status}
            </Badge>
          </SectionCard>
        </TabsContent>

        <TabsContent value="evaluaciones" className="mt-4">
          <AssessmentsTab clientId={clientId} canEdit />
        </TabsContent>
        <TabsContent value="progreso" className="mt-4">
          <ProgressTab clientId={clientId} />
        </TabsContent>
        <TabsContent value="fotos" className="mt-4">
          <PhotosTab clientId={clientId} />
        </TabsContent>
        <TabsContent value="rutinas" className="mt-4">
          <ClientRoutinesTab clientId={clientId} />
        </TabsContent>
        <TabsContent value="entrenamientos" className="mt-4">
          <WorkoutLogsTab clientId={clientId} />
        </TabsContent>
        <TabsContent value="fuerza" className="mt-4">
          <StrengthTab clientId={clientId} />
        </TabsContent>
        <TabsContent value="nutricion" className="mt-4">
          <NutritionTab clientId={clientId} canEdit />
        </TabsContent>
        <TabsContent value="habitos" className="mt-4">
          <HabitsTab clientId={clientId} canEdit />
        </TabsContent>
        <TabsContent value="checkins" className="mt-4">
          <CheckInsTab clientId={clientId} canReview />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <ChatPanel clientId={clientId} />
        </TabsContent>
        <TabsContent value="agenda" className="mt-4">
          <ClientAgendaTab clientId={clientId} canEdit />
        </TabsContent>
        <TabsContent value="pagos" className="mt-4">
          <ClientPaymentsTab clientId={clientId} canEdit />
        </TabsContent>
      </Tabs>

      {editing && (
        <ClientDialog
          open={editing}
          onOpenChange={setEditing}
          title="Editar cliente"
          initial={client}
          busy={update.isPending}
          onSubmit={(values) => update.mutate(values)}
        />
      )}
    </div>
  );
}
