import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck, CalendarClock, Pencil } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/fitcore/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { classPackage, createRecurringClasses, setClassesPurchased } from "@/lib/clases";
import { useAuth } from "@/lib/auth-context";

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

function localDateValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Paquete de clases contratadas del cliente.
 * Restantes = contratadas − completadas (sólo descuentan las clases completadas).
 */
export function ClassPackageCard({ clientId, canEdit }: { clientId: string; canEdit?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [total, setTotal] = useState("");
  const [scheduleTotal, setScheduleTotal] = useState("");
  const [startDate, setStartDate] = useState(localDateValue);
  const [time, setTime] = useState("07:00");
  const [duration, setDuration] = useState("60");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);

  const { data } = useQuery({ queryKey: ["class-package", clientId], queryFn: () => classPackage(clientId) });

  const save = useMutation({
    mutationFn: async () => setClassesPurchased(clientId, Number(total) || 0),
    onSuccess: () => {
      toast.success("Paquete de clases actualizado");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["class-package", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const schedule = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sesión no válida");
      return createRecurringClasses({
        clientId,
        trainerId: user.id,
        totalClasses: Number(scheduleTotal) || 0,
        startDate,
        weekdays,
        time,
        durationMin: Number(duration) || 60,
        classType: "personal",
      });
    },
    onSuccess: ({ created, skipped }) => {
      toast.success(skipped ? `${created} clases agendadas · ${skipped} ya existían` : `${created} clases agendadas automáticamente`);
      setScheduleOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      void queryClient.invalidateQueries({ queryKey: ["class-package", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchased = data?.purchased ?? 0;
  const completed = data?.completed ?? 0;
  const remaining = data?.remaining ?? 0;
  const pct = purchased > 0 ? Math.min(100, Math.round((completed / purchased) * 100)) : 0;

  const toggleDay = (day: number) => setWeekdays((current) => current.includes(day) ? current.filter((d) => d !== day) : [...current, day]);

  return (
    <SectionCard
      title="Clases contratadas"
      action={
        canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setScheduleTotal(String(Math.max(0, remaining))); setStartDate(localDateValue()); setScheduleOpen(true); }}>
              <CalendarClock className="mr-2 h-3.5 w-3.5" /> Agendar automáticamente
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setTotal(String(purchased)); setOpen(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Ajustar total
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Contratadas", value: purchased, tone: "text-foreground" },
          { label: "Completadas", value: completed, tone: "text-neon" },
          { label: "Restantes", value: remaining, tone: remaining <= 0 ? "text-destructive" : "text-success" },
        ].map((i) => (
          <div key={i.label} className="rounded-xl border border-border/70 bg-surface p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.label}</p>
            <p className={`mt-1 text-xl font-semibold ${i.tone}`}>{i.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground">{purchased > 0 ? `${pct}% del paquete consumido. Sólo las clases marcadas como completadas descuentan.` : "Sin paquete asignado todavía."}</p>
      </div>

      {remaining <= 0 && purchased > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <CalendarCheck className="h-3.5 w-3.5" /> El paquete está agotado. Ajusta el total para renovarlo.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar clases contratadas</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="total-clases">Total contratado</Label>
            <Input id="total-clases" type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
            <p className="text-xs text-muted-foreground">Completadas actuales: {completed}. Restantes tras guardar: {(Number(total) || 0) - completed}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar clases automáticamente</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label htmlFor="schedule-total">Clases a agendar</Label><Input id="schedule-total" type="number" min={1} value={scheduleTotal} onChange={(e) => setScheduleTotal(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="schedule-duration">Duración (min)</Label><Input id="schedule-duration" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label htmlFor="schedule-start">Fecha de inicio</Label><Input id="schedule-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="schedule-time">Hora</Label><Input id="schedule-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Días de entrenamiento</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${weekdays.includes(day.value) ? "border-primary bg-primary/15 text-neon shadow-neon" : "border-border bg-surface text-muted-foreground hover:border-primary/40"}`}>
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="rounded-lg border border-border/70 bg-surface px-3 py-2 text-xs text-muted-foreground">
              Se crearán las sesiones desde la fecha indicada, sólo en los días seleccionados y a la hora elegida. Si alguna sesión ya existe exactamente en ese horario, se conservará y no se duplicará.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button onClick={() => schedule.mutate()} disabled={schedule.isPending || !weekdays.length || !scheduleTotal}>
              {schedule.isPending ? "Agendando…" : "Agendar clases"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
