import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import { SET_TYPES, type FullExercise, type PlannedSetRow, type SetType } from "@/lib/rutinas";

export type DraftSet = {
  set_number: number;
  set_type: SetType;
  reps: string | null;
  weight: number | null;
  time_seconds: number | null;
  distance_m: number | null;
  rest_seconds: number | null;
  rir: number | null;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
};

export type ExerciseConfig = {
  set_type: SetType;
  group_label: string | null;
  reps: string | null;
  weight: number | null;
  rest_seconds: number | null;
  time_seconds: number | null;
  distance_m: number | null;
  rir: number | null;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
  tips: string | null;
};

function toDraft(sets: PlannedSetRow[]): DraftSet[] {
  return sets.map((s) => ({
    set_number: s.set_number,
    set_type: s.set_type,
    reps: s.reps,
    weight: s.weight,
    time_seconds: s.time_seconds,
    distance_m: s.distance_m,
    rest_seconds: s.rest_seconds,
    rir: s.rir,
    rpe: s.rpe,
    tempo: s.tempo,
    notes: s.notes,
  }));
}

const num = (v: string): number | null => (v === "" ? null : Number(v));

export function SetEditor({
  open,
  onOpenChange,
  item,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: FullExercise;
  busy?: boolean;
  onSave: (config: ExerciseConfig, sets: DraftSet[]) => void;
}) {
  const [config, setConfig] = useState<ExerciseConfig>({
    set_type: "normal",
    group_label: null,
    reps: null,
    weight: null,
    rest_seconds: null,
    time_seconds: null,
    distance_m: null,
    rir: null,
    rpe: null,
    tempo: null,
    notes: null,
    tips: null,
  });
  const [sets, setSets] = useState<DraftSet[]>([]);

  useEffect(() => {
    if (!open) return;
    setConfig({
      set_type: item.set_type,
      group_label: item.group_label,
      reps: item.reps,
      weight: item.weight,
      rest_seconds: item.rest_seconds,
      time_seconds: item.time_seconds,
      distance_m: item.distance_m,
      rir: item.rir,
      rpe: item.rpe,
      tempo: item.tempo,
      notes: item.notes,
      tips: item.tips,
    });
    setSets(
      item.plannedSets.length > 0
        ? toDraft(item.plannedSets)
        : Array.from({ length: item.sets ?? 3 }).map((_, i) => ({
            set_number: i + 1,
            set_type: item.set_type,
            reps: item.reps,
            weight: item.weight,
            time_seconds: item.time_seconds,
            distance_m: item.distance_m,
            rest_seconds: item.rest_seconds,
            rir: item.rir,
            rpe: item.rpe,
            tempo: item.tempo,
            notes: null,
          })),
    );
  }, [open, item]);

  function updateSet(index: number, patch: Partial<DraftSet>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSet() {
    setSets((prev) => [
      ...prev,
      {
        set_number: prev.length + 1,
        set_type: config.set_type,
        reps: config.reps,
        weight: config.weight,
        time_seconds: null,
        distance_m: null,
        rest_seconds: config.rest_seconds,
        rir: config.rir,
        rpe: config.rpe,
        tempo: config.tempo,
        notes: null,
      },
    ]);
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, set_number: i + 1 })));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item.exercise?.name ?? "Configurar ejercicio"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Tipo de serie</Label>
              <Select
                value={config.set_type}
                onValueChange={(v) => setConfig((c) => ({ ...c, set_type: v as SetType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SET_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="group">Grupo (A1, A2…)</Label>
              <Input
                id="group"
                value={config.group_label ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, group_label: e.target.value.toUpperCase() || null }))
                }
                placeholder="A1"
              />
            </div>
            <div>
              <Label htmlFor="tempo">Tempo</Label>
              <Input
                id="tempo"
                value={config.tempo ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, tempo: e.target.value || null }))}
                placeholder="3-1-1"
              />
            </div>
            <div>
              <Label htmlFor="reps">Reps objetivo</Label>
              <Input
                id="reps"
                value={config.reps ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, reps: e.target.value || null }))}
                placeholder="8-10"
              />
            </div>
            <div>
              <Label htmlFor="w">Peso objetivo (kg)</Label>
              <Input
                id="w"
                type="number"
                step="0.5"
                value={config.weight ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, weight: num(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="rest">Descanso (s)</Label>
              <Input
                id="rest"
                type="number"
                value={config.rest_seconds ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, rest_seconds: num(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="time">Tiempo (s)</Label>
              <Input
                id="time"
                type="number"
                value={config.time_seconds ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, time_seconds: num(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="dist">Distancia (m)</Label>
              <Input
                id="dist"
                type="number"
                value={config.distance_m ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, distance_m: num(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="rir">RIR</Label>
              <Input
                id="rir"
                type="number"
                step="0.5"
                value={config.rir ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, rir: num(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="rpe">RPE</Label>
              <Input
                id="rpe"
                type="number"
                step="0.5"
                value={config.rpe ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, rpe: num(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Series planificadas
              </h3>
              <Button type="button" variant="secondary" size="sm" onClick={addSet}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Añadir serie
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {sets.map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))_auto] items-center gap-2 rounded-xl border border-border/70 bg-surface p-2"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/12 text-xs font-semibold text-neon">
                    {s.set_number}
                  </span>
                  <Select
                    value={s.set_type}
                    onValueChange={(v) => updateSet(i, { set_type: v as SetType })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SET_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-9 text-xs"
                    value={s.reps ?? ""}
                    onChange={(e) => updateSet(i, { reps: e.target.value || null })}
                    placeholder="reps"
                  />
                  <Input
                    className="h-9 text-xs"
                    type="number"
                    step="0.5"
                    value={s.weight ?? ""}
                    onChange={(e) => updateSet(i, { weight: num(e.target.value) })}
                    placeholder="kg"
                  />
                  <Input
                    className="h-9 text-xs"
                    type="number"
                    value={s.rest_seconds ?? ""}
                    onChange={(e) => updateSet(i, { rest_seconds: num(e.target.value) })}
                    placeholder="desc. s"
                  />
                  <Input
                    className="h-9 text-xs"
                    type="number"
                    step="0.5"
                    value={s.rir ?? ""}
                    onChange={(e) => updateSet(i, { rir: num(e.target.value) })}
                    placeholder="RIR"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSet(i)}
                    aria-label="Eliminar serie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="enotes">Notas para el cliente</Label>
              <Textarea
                id="enotes"
                rows={3}
                value={config.notes ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, notes: e.target.value || null }))}
              />
            </div>
            <div>
              <Label htmlFor="etips">Consejos técnicos</Label>
              <Textarea
                id="etips"
                rows={3}
                value={config.tips ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, tips: e.target.value || null }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => onSave(config, sets)}>
            {busy ? "Guardando…" : "Guardar configuración"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
