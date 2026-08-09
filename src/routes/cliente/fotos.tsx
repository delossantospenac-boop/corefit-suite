import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Camera, MoveHorizontal } from "lucide-react";

import { EmptyState, ListSkeleton, PageHeader, SectionCard } from "@/components/fitcore/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/fitcore";
import { prettyLabel } from "@/lib/rutinas";

export const Route = createFileRoute("/cliente/fotos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mis fotos · FITCORE" },
      { property: "og:title", content: "Mis fotos · FITCORE" },
      { property: "og:description", content: "Compara tu evolución física a través de tus fotos de progreso." },
    ],
  }),
  component: MisFotos,
});

function MisFotos() {
  const { clientId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["cliente-fotos", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("client_id", clientId!)
        .order("taken_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [beforeId, setBeforeId] = useState<string>("");
  const [afterId, setAfterId] = useState<string>("");

  const photos = data ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, typeof photos>();
    for (const p of photos) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [photos]);

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  const before = photos.find((p) => p.id === beforeId);
  const after = photos.find((p) => p.id === afterId);

  return (
    <div className="space-y-5">
      <PageHeader title="Mis fotos" subtitle="Tu galería de progreso" />

      <SectionCard title="Comparador antes / después">
        <div className="grid grid-cols-2 gap-3">
          <PhotoPicker label="Antes" photos={photos} value={beforeId} onChange={setBeforeId} {...(before?.url ? { image: before.url } : {})} />
          <PhotoPicker label="Después" photos={photos} value={afterId} onChange={setAfterId} {...(after?.url ? { image: after.url } : {})} />

        </div>
        {before && after && (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <MoveHorizontal className="h-3.5 w-3.5" />
            {formatDate(before.taken_on)} → {formatDate(after.taken_on)}
          </p>
        )}
      </SectionCard>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : grouped.length === 0 ? (
        <EmptyState icon={Camera} title="Aún no tienes fotos de progreso" />
      ) : (
        grouped.map(([category, list]) => (
          <SectionCard key={category} title={prettyLabel(category)}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {list.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-xl border border-border/70">
                  <img src={p.url} alt={category} className="aspect-square w-full object-cover" />
                  <p className="p-2 text-center text-xs text-muted-foreground">{formatDate(p.taken_on)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}

function PhotoPicker({
  label,
  photos,
  value,
  onChange,
  image,
}: {
  label: string;
  photos: { id: string; taken_on: string; category: string }[];
  value: string;
  onChange: (v: string) => void;
  image?: string;
}) {
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {photos.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {formatDate(p.taken_on)} · {prettyLabel(p.category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="aspect-square overflow-hidden rounded-xl border border-dashed border-border/70 bg-surface">
        {image ? (
          <img src={image} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">{label}</div>
        )}
      </div>
    </div>
  );
}
