import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState, ListSkeleton, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/fitcore";
import { formatLength, formatWeight } from "@/lib/units";

export const Route = createFileRoute("/cliente/evaluaciones")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mis evaluaciones · FITCORE" },
      { property: "og:title", content: "Mis evaluaciones · FITCORE" },
      { property: "og:description", content: "Consulta el historial de tus evaluaciones físicas." },
    ],
  }),
  component: MisEvaluaciones,
});

function MisEvaluaciones() {
  const { clientId, units } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-evaluaciones", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("client_id", clientId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  const chartData = [...(data ?? [])]
    .reverse()
    .map((a) => ({ date: formatDate(a.date), peso: a.weight_kg, grasa: a.body_fat_pct }));

  return (
    <div className="space-y-5">
      <PageHeader title="Mis evaluaciones" subtitle="Historial de composición corporal" />

      <SectionCard title="Evolución">
        {chartData.length === 0 ? (
          <EmptyState title="Sin evaluaciones registradas" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} name="Peso (kg)" />
                <Line type="monotone" dataKey="grasa" stroke="hsl(var(--warning))" strokeWidth={2} name="Grasa %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Historial completo">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin evaluaciones" />
        ) : (
          <ul className="space-y-3">
            {(data ?? []).map((a) => (
              <li key={a.id} className="rounded-xl border border-border/70 bg-surface p-3.5 text-sm">
                <p className="font-medium">{formatDate(a.date)}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Peso: {formatWeight(a.weight_kg, units.weight)}</span>
                  <span>Altura: {formatLength(a.height_cm, units.length)}</span>
                  <span>Grasa: {a.body_fat_pct ? `${a.body_fat_pct}%` : "—"}</span>
                  <span>Masa muscular: {a.muscle_mass ? `${a.muscle_mass} kg` : "—"}</span>
                  <span>Cintura: {formatLength(a.waist_cm, units.length)}</span>
                  <span>Cadera: {formatLength(a.hip_cm, units.length)}</span>
                  <span>Pecho: {formatLength(a.chest_cm, units.length)}</span>
                  <span>Brazo: {formatLength(a.arm_cm, units.length)}</span>
                  <span>Muslo: {formatLength(a.thigh_cm, units.length)}</span>
                  <span>Pantorrilla: {formatLength(a.calf_cm, units.length)}</span>
                </div>
                {a.notes && <p className="mt-2 text-xs italic text-muted-foreground">{a.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
