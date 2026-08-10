import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Ruler, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  DISTANCE_UNITS,
  LENGTH_UNITS,
  WEIGHT_UNITS,
  formatLength,
  formatWeight,
  type DistanceUnit,
  type LengthUnit,
  type WeightUnit,
} from "@/lib/units";

export const Route = createFileRoute("/app/ajustes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Unidades de medida · FITCORE" },
      {
        name: "description",
        content:
          "Configura las unidades de peso, longitud y distancia que se usan en ejercicios, rutinas y evaluaciones.",
      },
      { property: "og:title", content: "Unidades de medida · FITCORE" },
      {
        property: "og:description",
        content: "Kilogramos o libras, centímetros o pulgadas, kilómetros o millas.",
      },
    ],
  }),
  component: UnitsSettings,
});

function UnitsSettings() {
  const { user, units, refresh } = useAuth();
  const [weight, setWeight] = useState<WeightUnit>(units.weight);
  const [length, setLength] = useState<LengthUnit>(units.length);
  const [distance, setDistance] = useState<DistanceUnit>(units.distance);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sesión no válida");
      const { error } = await supabase
        .from("profiles")
        .update({ unit_weight: weight, unit_length: length, unit_distance: distance })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Unidades actualizadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = weight !== units.weight || length !== units.length || distance !== units.distance;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Unidades de medida"
        subtitle="Se aplican a ejercicios, rutinas, evaluaciones y progreso"
        action={
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        }
      />

      <SectionCard title="Mis unidades" subtitle="Los datos se guardan siempre en kg, cm y metros y se convierten al mostrarse">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Peso</Label>
            <Select value={weight} onValueChange={(v) => setWeight(v as WeightUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Altura y medidas</Label>
            <Select value={length} onValueChange={(v) => setLength(v as LengthUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTH_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Distancia</Label>
            <Select value={distance} onValueChange={(v) => setDistance(v as DistanceUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Vista previa de la conversión">
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-xl border border-border/70 bg-surface p-3">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Ruler className="h-3 w-3" /> 80 kg
            </p>
            <p className="mt-1 text-lg font-semibold text-neon">{formatWeight(80, weight)}</p>
          </li>
          <li className="rounded-xl border border-border/70 bg-surface p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">175 cm</p>
            <p className="mt-1 text-lg font-semibold text-neon">{formatLength(175, length)}</p>
          </li>
          <li className="rounded-xl border border-border/70 bg-surface p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Distancia</p>
            <p className="mt-1 text-lg font-semibold text-neon">
              {distance === "mi" ? "millas" : "kilómetros"}
            </p>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
