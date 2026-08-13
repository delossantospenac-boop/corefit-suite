import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Dumbbell, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ListSkeleton, PageHeader } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTIES, EQUIPMENT, MUSCLE_GROUPS, fetchExerciseLibrary, prettyLabel, type ExerciseRow } from "@/lib/rutinas";

export const Route = createFileRoute("/app/ejercicios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Biblioteca de ejercicios — FITCORE" },
      { name: "description", content: "Crea y gestiona tu propia biblioteca de ejercicios." },
      { property: "og:title", content: "Biblioteca de ejercicios — FITCORE" },
      { property: "og:description", content: "Ejercicios propios y globales listos para usar en tus rutinas." },
    ],
  }),
  component: ExercisesPage,
});

const ALL = "__all__";

type ExerciseValues = {
  name: string;
  muscle_group: string | null;
  secondary_muscles: string;
  equipment: string | null;
  difficulty: string | null;
  exercise_type: string;
  video_url: string;
  image_url: string;
  description: string;
  instructions: string;
  tips: string;
  common_mistakes: string;
  variations: string;
};

const EMPTY: ExerciseValues = {
  name: "",
  muscle_group: null,
  secondary_muscles: "",
  equipment: null,
  difficulty: null,
  exercise_type: "fuerza",
  video_url: "",
  image_url: "",
  description: "",
  instructions: "",
  tips: "",
  common_mistakes: "",
  variations: "",
};

function ExercisesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState(ALL);
  const [equipment, setEquipment] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [etype, setEtype] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseRow | null>(null);

  const libraryQuery = useQuery({ queryKey: ["exercise-library"], queryFn: fetchExerciseLibrary });
  const library = libraryQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return library.filter((e) => {
      const matchTerm = !term || e.name.toLowerCase().includes(term);
      const matchM = muscle === ALL || e.muscle_group === muscle;
      const matchE = equipment === ALL || e.equipment === equipment;
      const matchD = difficulty === ALL || e.difficulty === difficulty;
      const matchT = etype === ALL || (e.exercise_type ?? "fuerza") === etype;
      return matchTerm && matchM && matchE && matchD && matchT;
    });
  }, [library, search, muscle, equipment, difficulty, etype]);

  const save = useMutation({
    mutationFn: async (values: ExerciseValues) => {
      if (!user) throw new Error("Sesión no válida");
      const payload = {
        name: values.name,
        muscle_group: values.muscle_group,
        secondary_muscles: values.secondary_muscles
          ? values.secondary_muscles.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        equipment: values.equipment,
        difficulty: values.difficulty,
        exercise_type: values.exercise_type || null,
        video_url: values.video_url || null,
        image_url: values.image_url || null,
        description: values.description || null,
        instructions: values.instructions || null,
        tips: values.tips || null,
        common_mistakes: values.common_mistakes || null,
        variations: values.variations || null,
      };
      if (editing) {
        const { error } = await supabase.from("exercises").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercises").insert({ ...payload, trainer_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Ejercicio actualizado" : "Ejercicio creado");
      setFormOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ejercicio eliminado");
      void queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ejercicios"
        subtitle="Tu biblioteca de ejercicios para construir rutinas"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo ejercicio
          </Button>
        }
      />

      <div className="card-surface flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ejercicio…" className="pl-9" />
        </div>
        <Select value={muscle} onValueChange={setMuscle}>
          <SelectTrigger className="w-full sm:w-40">
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
          <SelectTrigger className="w-full sm:w-40">
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
          <SelectTrigger className="w-full sm:w-40">
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
        <Select value={etype} onValueChange={setEtype}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            <SelectItem value="funcional">Funcional</SelectItem>
            <SelectItem value="fuerza">Fuerza</SelectItem>
            <SelectItem value="cardio">Cardio</SelectItem>
            <SelectItem value="movilidad">Movilidad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {libraryQuery.isLoading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Sin ejercicios" description="Crea tu primer ejercicio para empezar." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => {
            const readOnly = !e.trainer_id;
            return (
              <li key={e.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium">{e.name}</p>
                  {readOnly && (
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      <Lock className="mr-1 h-3 w-3" /> Global
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {prettyLabel(e.muscle_group)} · {prettyLabel(e.equipment)} · {prettyLabel(e.difficulty)}
                </p>
                {e.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>}
                {!readOnly && (
                  <div className="mt-3 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(e);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${e.name}"?`)) remove.mutate(e.id);
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ExerciseFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        busy={save.isPending}
        onSubmit={(values) => save.mutate(values)}
      />
    </div>
  );
}

function ExerciseFormDialog({
  open,
  onOpenChange,
  initial,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ExerciseRow | null;
  busy?: boolean;
  onSubmit: (values: ExerciseValues) => void;
}) {
  const [values, setValues] = useState<ExerciseValues>(EMPTY);

  useMemo(() => {
    if (!open) return;
    setValues(
      initial
        ? {
            name: initial.name,
            muscle_group: initial.muscle_group,
            secondary_muscles: (initial.secondary_muscles ?? []).join(", "),
            equipment: initial.equipment,
            difficulty: initial.difficulty,
            exercise_type: initial.exercise_type ?? "fuerza",
            video_url: initial.video_url ?? "",
            image_url: initial.image_url ?? "",
            description: initial.description ?? "",
            instructions: initial.instructions ?? "",
            tips: initial.tips ?? "",
            common_mistakes: initial.common_mistakes ?? "",
            variations: initial.variations ?? "",
          }
        : EMPTY,
    );
  }, [open, initial]);

  function set<K extends keyof ExerciseValues>(key: K, value: ExerciseValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar ejercicio" : "Nuevo ejercicio"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="ename">Nombre</Label>
            <Input id="ename" required value={values.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Grupo muscular</Label>
            <Select value={values.muscle_group ?? ""} onValueChange={(v) => set("muscle_group", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {prettyLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="smuscles">Músculos secundarios (coma)</Label>
            <Input
              id="smuscles"
              value={values.secondary_muscles}
              onChange={(e) => set("secondary_muscles", e.target.value)}
              placeholder="triceps, hombros"
            />
          </div>
          <div>
            <Label>Equipo</Label>
            <Select value={values.equipment ?? ""} onValueChange={(v) => set("equipment", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT.map((m) => (
                  <SelectItem key={m} value={m}>
                    {prettyLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dificultad</Label>
            <Select value={values.difficulty ?? ""} onValueChange={(v) => set("difficulty", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {prettyLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="etype">Tipo de ejercicio</Label>
            <Input id="etype" value={values.exercise_type} onChange={(e) => set("exercise_type", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="video">Video (URL)</Label>
            <Input id="video" value={values.video_url} onChange={(e) => set("video_url", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="image">Imagen (URL)</Label>
            <Input id="image" value={values.image_url} onChange={(e) => set("image_url", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Descripción</Label>
            <Textarea id="desc" rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="instr">Instrucciones</Label>
            <Textarea id="instr" rows={2} value={values.instructions} onChange={(e) => set("instructions", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tips">Consejos</Label>
            <Textarea id="tips" rows={2} value={values.tips} onChange={(e) => set("tips", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mistakes">Errores comunes</Label>
            <Textarea id="mistakes" rows={2} value={values.common_mistakes} onChange={(e) => set("common_mistakes", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="variations">Variaciones</Label>
            <Textarea id="variations" rows={2} value={values.variations} onChange={(e) => set("variations", e.target.value)} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar ejercicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
