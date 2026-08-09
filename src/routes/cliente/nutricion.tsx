import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Apple, Droplet } from "lucide-react";

import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { prettyLabel } from "@/lib/rutinas";

export const Route = createFileRoute("/cliente/nutricion")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nutrición · FITCORE" },
      { property: "og:title", content: "Nutrición · FITCORE" },
      { property: "og:description", content: "Consulta tu plan de nutrición activo y tus comidas asignadas." },
    ],
  }),
  component: Nutricion,
});

const MEAL_ORDER = ["desayuno", "almuerzo", "comida", "merienda", "cena", "snack", "otro"];

function Nutricion() {
  const { clientId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-nutricion", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data: plan } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("client_id", clientId!)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .maybeSingle();
      if (!plan) return { plan: null, meals: [] };
      const { data: meals } = await supabase
        .from("meals")
        .select("*")
        .eq("plan_id", plan.id)
        .order("created_at", { ascending: true });
      return { plan, meals: meals ?? [] };
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

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;

  if (!data?.plan) {
    return (
      <div className="space-y-5">
        <PageHeader title="Nutrición" subtitle="Tu plan alimenticio" />
        <EmptyState icon={Apple} title="Aún no tienes un plan de nutrición activo" />
      </div>
    );
  }

  const groups = new Map<string, typeof data.meals>();
  for (const m of data.meals) {
    const list = groups.get(m.meal_type) ?? [];
    list.push(m);
    groups.set(m.meal_type, list);
  }
  const orderedGroups = [...groups.entries()].sort(
    (a, b) => MEAL_ORDER.indexOf(a[0]) - MEAL_ORDER.indexOf(b[0]),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Nutrición" subtitle={data.plan.name} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Calorías" value={data.plan.calories ?? "—"} />
        <StatCard label="Proteína" value={data.plan.protein ? `${data.plan.protein} g` : "—"} />
        <StatCard label="Carbohidratos" value={data.plan.carbs ? `${data.plan.carbs} g` : "—"} />
        <StatCard label="Grasas" value={data.plan.fat ? `${data.plan.fat} g` : "—"} />
      </div>

      {data.plan.water_ml && (
        <SectionCard title="Hidratación">
          <div className="flex items-center gap-2 text-sm">
            <Droplet className="h-4 w-4 text-neon" /> Meta diaria: {(data.plan.water_ml / 1000).toFixed(1)} L
          </div>
        </SectionCard>
      )}

      {data.plan.notes && (
        <SectionCard title="Notas del entrenador">
          <p className="text-sm text-muted-foreground">{data.plan.notes}</p>
        </SectionCard>
      )}

      {orderedGroups.length === 0 ? (
        <EmptyState title="Sin comidas asignadas todavía" />
      ) : (
        orderedGroups.map(([type, meals]) => (
          <SectionCard key={type} title={prettyLabel(type)}>
            <ul className="space-y-2">
              {meals.map((m) => (
                <li key={m.id} className="rounded-xl border border-border/70 bg-surface p-3 text-sm">
                  <p className="font-medium">{m.name || prettyLabel(type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[m.calories && `${m.calories} kcal`, m.protein && `P: ${m.protein}g`, m.carbs && `C: ${m.carbs}g`, m.fat && `G: ${m.fat}g`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {m.notes && <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>}
                </li>
              ))}
            </ul>
          </SectionCard>
        ))
      )}
    </div>
  );
}
