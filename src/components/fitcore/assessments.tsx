import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Ruler, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, SectionCard } from "@/components/fitcore/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/fitcore";

export type Assessment = {
  id: string;
  date: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  fat_mass: number | null;
  muscle_mass: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  notes: string | null;
};

const FIELDS: { key: keyof Assessment; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "height_cm", label: "Altura", unit: "cm" },
  { key: "body_fat_pct", label: "% grasa", unit: "%" },
  { key: "fat_mass", label: "Masa grasa", unit: "kg" },
  { key: "muscle_mass", label: "Masa muscular", unit: "kg" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "hip_cm", label: "Cadera", unit: "cm" },
  { key: "chest_cm", label: "Pecho", unit: "cm" },
  { key: "arm_cm", label: "Brazo", unit: "cm" },
  { key: "thigh_cm", label: "Muslo", unit: "cm" },
  { key: "calf_cm", label: "Pantorrilla", unit: "cm" },
];

export function useAssessments(clientId: string) {
  return useQuery({
    queryKey: ["assessments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Assessment[];
    },
  });
}

export function AssessmentsTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const query = useAssessments(clientId);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const create = useMutation({
    mutationFn: async () => {
      const numeric: Record<string, number | null> = {};
      for (const f of FIELDS) {
        const raw = values[f.key as string];
        numeric[f.key as string] = raw ? Number(raw) : null;
      }
      const w = numeric["weight_kg"];
      const h = numeric["height_cm"];
      const bmi = w && h ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;
      const { error } = await supabase
        .from("assessments")
        .insert({ client_id: clientId, date, bmi, notes: notes || null, ...numeric });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evaluación registrada");
      setOpen(false);
      setValues({});
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: ["assessments", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = query.data ?? [];
  const chart = list.map((a) => ({
    label: formatDate(a.date),
    peso: a.weight_kg,
    grasa: a.body_fat_pct,
    musculo: a.muscle_mass,
  }));

  return (
    <div className="space-y-4">
      <SectionCard
        title="Evolución"
        subtitle="Peso, grasa corporal y masa muscular por evaluación"
        action={
          canEdit ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva evaluación
            </Button>
          ) : undefined
        }
      >
        {list.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="Sin evaluaciones"
            description="Registra la primera evaluación física para empezar a medir el progreso."
          />
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="grasa" name="% grasa" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="musculo" name="Músculo (kg)" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {list.length > 0 && (
        <SectionCard title="Historial de evaluaciones">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="pb-2">Fecha</th>
                  {FIELDS.slice(0, 7).map((f) => (
                    <th key={f.key as string} className="pb-2">
                      {f.label}
                    </th>
                  ))}
                  <th className="pb-2">IMC</th>
                </tr>
              </thead>
              <tbody>
                {[...list].reverse().map((a) => (
                  <tr key={a.id} className="border-t border-border/60">
                    <td className="py-2.5">{formatDate(a.date)}</td>
                    {FIELDS.slice(0, 7).map((f) => (
                      <td key={f.key as string} className="py-2.5 text-muted-foreground">
                        {(a[f.key] as number | null) ?? "—"}
                      </td>
                    ))}
                    <td className="py-2.5 font-medium text-neon">{a.bmi ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva evaluación física</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key as string} className="space-y-2">
                  <Label htmlFor={f.key as string}>
                    {f.label} ({f.unit})
                  </Label>
                  <Input
                    id={f.key as string}
                    type="number"
                    step="0.1"
                    value={values[f.key as string] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key as string]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Guardar evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProgressTab({ clientId }: { clientId: string }) {
  const query = useAssessments(clientId);
  const [range, setRange] = useState<number | null>(90);
  const list = query.data ?? [];

  const filtered = range
    ? list.filter((a) => new Date(a.date).getTime() >= Date.now() - range * 86_400_000)
    : list;

  const ranges: { label: string; days: number | null }[] = [
    { label: "7 días", days: 7 },
    { label: "30 días", days: 30 },
    { label: "3 meses", days: 90 },
    { label: "6 meses", days: 180 },
    { label: "1 año", days: 365 },
    { label: "Todo", days: null },
  ];

  const series: { key: keyof Assessment; label: string; color: string }[] = [
    { key: "weight_kg", label: "Peso (kg)", color: "var(--chart-1)" },
    { key: "body_fat_pct", label: "% grasa", color: "var(--chart-5)" },
    { key: "muscle_mass", label: "Masa muscular (kg)", color: "var(--chart-4)" },
    { key: "waist_cm", label: "Cintura (cm)", color: "var(--chart-2)" },
    { key: "hip_cm", label: "Cadera (cm)", color: "var(--chart-3)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ranges.map((r) => (
          <Button
            key={r.label}
            size="sm"
            variant={range === r.days ? "default" : "secondary"}
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sin datos en este periodo"
          description="Registra evaluaciones para visualizar el progreso."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {series.map((s) => (
            <SectionCard key={s.key as string} title={s.label}>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filtered.map((a) => ({
                      label: formatDate(a.date),
                      value: a[s.key] as number | null,
                    }))}
                    margin={{ left: -22, right: 8, top: 8 }}
                  >
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="value" name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
