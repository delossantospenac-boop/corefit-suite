import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Ruler, Save, Target, User as UserIcon } from "lucide-react";

import { EmptyState, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/fitcore";
import { prettyLabel, statusTone as routineStatusTone } from "@/lib/rutinas";
import {
  DISTANCE_UNITS,
  formatLength,
  formatWeight,
  LENGTH_UNITS,
  WEIGHT_UNITS,
  type DistanceUnit,
  type LengthUnit,
  type WeightUnit,
} from "@/lib/units";

export const Route = createFileRoute("/cliente/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mi perfil · FITCORE" },
      { property: "og:title", content: "Mi perfil · FITCORE" },
      { property: "og:description", content: "Gestiona tus datos personales, unidades y ficha de cliente." },
    ],
  }),
  component: MiPerfil,
});

const clientStatusTone: Record<string, string> = {
  activo: "border-success/40 bg-success/10 text-success",
  pausado: "border-warning/40 bg-warning/10 text-warning",
  inactivo: "border-border bg-muted text-muted-foreground",
};

function MiPerfil() {
  const { user, profile, clientId, units, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(units.weight);
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(units.length);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(units.distance);
  const [savingUnits, setSavingUnits] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  useEffect(() => {
    setWeightUnit(units.weight);
    setLengthUnit(units.length);
    setDistanceUnit(units.distance);
  }, [units]);

  const { data: client, isLoading } = useQuery({
    queryKey: ["cliente-ficha", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null, bio: bio || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar tu perfil");
      return;
    }
    toast.success("Perfil actualizado");
    await refresh();
  }

  async function saveUnits() {
    if (!user) return;
    setSavingUnits(true);
    const { error } = await supabase
      .from("profiles")
      .update({ unit_weight: weightUnit, unit_length: lengthUnit, unit_distance: distanceUnit })
      .eq("id", user.id);
    setSavingUnits(false);
    if (error) {
      toast.error("No se pudieron guardar las unidades");
      return;
    }
    toast.success("Unidades actualizadas");
    await refresh();
    void queryClient.invalidateQueries();
  }

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/auth" });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Mi perfil" subtitle="Tus datos personales y preferencias" />

      <SectionCard title="Datos personales">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="bio">Biografía</Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <Button className="mt-4 gap-1.5" onClick={saveProfile} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </SectionCard>

      <SectionCard title="Unidades" subtitle="Cómo se muestran tus datos en la app">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Peso</Label>
            <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as WeightUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEIGHT_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Longitud</Label>
            <Select value={lengthUnit} onValueChange={(v) => setLengthUnit(v as LengthUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LENGTH_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Distancia</Label>
            <Select value={distanceUnit} onValueChange={(v) => setDistanceUnit(v as DistanceUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISTANCE_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4 gap-1.5" onClick={saveUnits} disabled={savingUnits}>
          <Ruler className="h-4 w-4" /> {savingUnits ? "Guardando..." : "Guardar unidades"}
        </Button>
      </SectionCard>

      <SectionCard title="Mi ficha de cliente" subtitle="Datos gestionados por tu entrenador">
        {!clientId ? (
          <EmptyState
            icon={UserIcon}
            title="Tu cuenta aún no está vinculada"
            description="Pide a tu entrenador que registre tu correo en su lista de clientes."
          />
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : !client ? (
          <EmptyState title="No se encontró tu ficha" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" /> Objetivo</span>
              <span className="font-medium">{prettyLabel(client.goal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant="outline" className={clientStatusTone[client.status] ?? ""}>
                {prettyLabel(client.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Fecha de inicio</span>
              <span className="font-medium">{formatDate(client.start_date)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Altura</span>
              <span className="font-medium">{formatLength(client.height_cm, units.length)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Peso</span>
              <span className="font-medium">{formatWeight(client.weight_kg, units.weight)}</span>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Sesión">
        <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </SectionCard>
    </div>
  );
}
