import { useEffect, useState } from "react";

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
import { GOALS, LEVELS, STATUSES, type RoutineInput, type RoutineRow } from "@/lib/rutinas";

export type RoutineFormValues = RoutineInput;

const NO_CLIENT = "__none__";

export function RoutineForm({
  open,
  onOpenChange,
  title,
  initial,
  clients,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: Partial<RoutineRow>;
  clients: { id: string; full_name: string }[];
  busy?: boolean;
  onSubmit: (values: RoutineFormValues) => void;
}) {
  const [values, setValues] = useState<RoutineFormValues>({
    name: "",
    client_id: null,
    goal: "hipertrofia",
    level: "intermedio",
    status: "activa",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    days_per_week: 4,
    suggested_time: null,
    weeks: 4,
    description: null,
    notes: null,
    is_template: false,
  });

  useEffect(() => {
    if (!open) return;
    setValues((prev) => ({
      ...prev,
      name: initial?.name ?? "",
      client_id: initial?.client_id ?? null,
      goal: initial?.goal ?? "hipertrofia",
      level: initial?.level ?? "intermedio",
      status: initial?.status ?? "activa",
      start_date: initial?.start_date ?? new Date().toISOString().slice(0, 10),
      end_date: initial?.end_date ?? null,
      days_per_week: initial?.days_per_week ?? 4,
      suggested_time: initial?.suggested_time ?? null,
      weeks: initial?.weeks ?? 4,
      description: initial?.description ?? null,
      notes: initial?.notes ?? null,
      is_template: initial?.is_template ?? false,
    }));
  }, [open, initial]);

  function set<K extends keyof RoutineFormValues>(key: K, value: RoutineFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="rname">Nombre de la rutina</Label>
            <Input
              id="rname"
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej. Hipertrofia Fase 1 · 4 días"
            />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={values.is_template ? "plantilla" : "rutina"}
              onValueChange={(v) => set("is_template", v === "plantilla")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rutina">Rutina de cliente</SelectItem>
                <SelectItem value="plantilla">Plantilla reutilizable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cliente asignado</Label>
            <Select
              value={values.client_id ?? NO_CLIENT}
              onValueChange={(v) => set("client_id", v === NO_CLIENT ? null : v)}
              disabled={values.is_template}
            >
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

          <div>
            <Label>Objetivo</Label>
            <Select value={values.goal ?? ""} onValueChange={(v) => set("goal", v as never)}>
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

          <div>
            <Label>Nivel</Label>
            <Select value={values.level ?? ""} onValueChange={(v) => set("level", v as never)}>
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

          <div>
            <Label>Estado</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dpw">Días por semana</Label>
            <Input
              id="dpw"
              type="number"
              min={1}
              max={7}
              value={values.days_per_week}
              onChange={(e) => set("days_per_week", Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="start">Fecha de inicio</Label>
            <Input
              id="start"
              type="date"
              value={values.start_date ?? ""}
              onChange={(e) => set("start_date", e.target.value || null)}
            />
          </div>

          <div>
            <Label htmlFor="end">Fecha de fin</Label>
            <Input
              id="end"
              type="date"
              value={values.end_date ?? ""}
              onChange={(e) => set("end_date", e.target.value || null)}
            />
          </div>

          <div>
            <Label htmlFor="weeks">Semanas</Label>
            <Input
              id="weeks"
              type="number"
              min={1}
              max={52}
              value={values.weeks}
              onChange={(e) => set("weeks", Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="time">Hora sugerida</Label>
            <Input
              id="time"
              type="time"
              value={values.suggested_time ?? ""}
              onChange={(e) => set("suggested_time", e.target.value || null)}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notas para el cliente</Label>
            <Textarea
              id="notes"
              rows={3}
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="Indicaciones generales, calentamiento, progresión…"
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar rutina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
