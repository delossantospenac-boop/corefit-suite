import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck, Pencil } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/fitcore/primitives";
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
import { Progress } from "@/components/ui/progress";
import { classPackage, setClassesPurchased } from "@/lib/clases";

/**
 * Paquete de clases contratadas del cliente.
 * Restantes = contratadas − completadas (sólo descuentan las clases completadas).
 */
export function ClassPackageCard({ clientId, canEdit }: { clientId: string; canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState("");

  const { data } = useQuery({
    queryKey: ["class-package", clientId],
    queryFn: () => classPackage(clientId),
  });

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

  const purchased = data?.purchased ?? 0;
  const completed = data?.completed ?? 0;
  const remaining = data?.remaining ?? 0;
  const pct = purchased > 0 ? Math.min(100, Math.round((completed / purchased) * 100)) : 0;

  return (
    <SectionCard
      title="Clases contratadas"
      action={
        canEdit ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setTotal(String(purchased));
              setOpen(true);
            }}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" /> Ajustar total
          </Button>
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
        <p className="text-xs text-muted-foreground">
          {purchased > 0
            ? `${pct}% del paquete consumido. Sólo las clases marcadas como completadas descuentan.`
            : "Sin paquete asignado todavía."}
        </p>
      </div>

      {remaining <= 0 && purchased > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <CalendarCheck className="h-3.5 w-3.5" /> El paquete está agotado. Ajusta el total para
          renovarlo.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar clases contratadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="total-clases">Total contratado</Label>
            <Input
              id="total-clases"
              type="number"
              min={0}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Completadas actuales: {completed}. Restantes tras guardar:{" "}
              {(Number(total) || 0) - completed}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
