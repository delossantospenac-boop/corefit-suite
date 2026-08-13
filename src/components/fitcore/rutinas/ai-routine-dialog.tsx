import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateRoutinePlan, type AiPlan } from "@/lib/ai-rutinas.functions";
import { applyGeneratedPlan } from "@/lib/rutinas-ai";
import { fetchExerciseLibrary, GOALS, LEVELS, type RoutineGoal, type RoutineLevel } from "@/lib/rutinas";

const NO_CLIENT = "__none__";

const STYLES = [
  { value: "funcional", label: "Entrenamiento funcional" },
  { value: "hiit_metabolico", label: "HIIT / metabólico" },
  { value: "gimnasio_pesas", label: "Gimnasio con pesas" },
  { value: "peso_corporal", label: "Solo peso corporal" },
  { value: "fuerza_basica", label: "Fuerza básica (barra)" },
  { value: "movilidad_core", label: "Movilidad y core" },
];

export function AiRoutineDialog({
  open,
  onOpenChange,
  clients,
  trainerId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: { id: string; full_name: string }[];
  trainerId: string;
  onCreated: (routineId: string) => void;
}) {
  const generate = useServerFn(generateRoutinePlan);

  const [goal, setGoal] = useState<RoutineGoal>("hipertrofia");
  const [level, setLevel] = useState<RoutineLevel>("intermedio");
  const [style, setStyle] = useState("funcional");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [weeks, setWeeks] = useState(4);
  const [clientId, setClientId] = useState(NO_CLIENT);
  const [info, setInfo] = useState("");
  const [asTemplate, setAsTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "saving">("form");

  async function run() {
    if (!trainerId) return;
    setBusy(true);
    setStep("form");
    try {
      const library = await fetchExerciseLibrary();
      const client = clients.find((c) => c.id === clientId) ?? null;
      const plan = (await generate({
        data: {
          goal,
          level,
          style: STYLES.find((s) => s.value === style)?.label ?? style,
          daysPerWeek,
          weeks,
          clientName: client?.full_name ?? null,
          clientInfo: info.trim() || null,
          library: library.map((e) => e.name),
        },
      })) as AiPlan;

      setStep("saving");
      const routineId = await applyGeneratedPlan({
        plan,
        trainerId,
        clientId: clientId === NO_CLIENT ? null : clientId,
        goal,
        level,
        weeks,
        asTemplate,
        exerciseType: style === "funcional" ? "funcional" : "fuerza",
      });
      toast.success("Rutina generada con IA");
      onOpenChange(false);
      onCreated(routineId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la rutina");
    } finally {
      setBusy(false);
      setStep("form");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon" /> Crear rutina con IA
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Select value={goal} onValueChange={(v) => setGoal(v as RoutineGoal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOALS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nivel</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as RoutineLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de entrenamiento</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={asTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLIENT}>Sin asignar</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-dpw">Días por semana</Label>
            <Input
              id="ai-dpw"
              type="number"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-weeks">Semanas</Label>
            <Input
              id="ai-weeks"
              type="number"
              min={1}
              max={24}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ai-info">Datos del cliente / restricciones (opcional)</Label>
            <Textarea
              id="ai-info"
              rows={3}
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Ej. 34 años, molestia lumbar, entrena en casa con mancuernas y bandas…"
            />
          </div>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={asTemplate}
              onChange={(e) => setAsTemplate(e.target.checked)}
            />
            Guardar como plantilla reutilizable
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void run()} disabled={busy} className="shadow-neon">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {step === "saving" ? "Guardando rutina…" : "Generando…"}
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Generar rutina
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
