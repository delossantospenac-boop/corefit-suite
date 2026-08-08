import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTIES, EQUIPMENT, MUSCLE_GROUPS, prettyLabel, type ExerciseRow } from "@/lib/rutinas";

const ALL = "__all__";

export function ExercisePicker({
  open,
  onOpenChange,
  library,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  library: ExerciseRow[];
  onPick: (exercise: ExerciseRow) => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState(ALL);
  const [equipment, setEquipment] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);

  const filtered = useMemo(
    () =>
      library.filter((e) => {
        const matchQ = !q || e.name.toLowerCase().includes(q.toLowerCase());
        const matchM = muscle === ALL || e.muscle_group === muscle;
        const matchE = equipment === ALL || e.equipment === equipment;
        const matchD = difficulty === ALL || e.difficulty === difficulty;
        return matchQ && matchM && matchE && matchD;
      }),
    [library, q, muscle, equipment, difficulty],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ejercicio…"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select value={muscle} onValueChange={setMuscle}>
              <SelectTrigger>
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los grupos</SelectItem>
                {MUSCLE_GROUPS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {prettyLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={equipment} onValueChange={setEquipment}>
              <SelectTrigger>
                <SelectValue placeholder="Equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todo el equipo</SelectItem>
                {EQUIPMENT.map((m) => (
                  <SelectItem key={m} value={m}>
                    {prettyLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los niveles</SelectItem>
                {DIFFICULTIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {prettyLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin resultados con esos filtros.
              </p>
            )}
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  onPick(e);
                  onOpenChange(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {prettyLabel(e.muscle_group)} · {prettyLabel(e.equipment)}
                  </span>
                </span>
                {e.difficulty && (
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                    {prettyLabel(e.difficulty)}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
