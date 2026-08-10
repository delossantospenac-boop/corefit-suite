import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/fitcore/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { homeForRole, useAuth } from "@/lib/auth-context";
import { currency } from "@/lib/fitcore";

export const Route = createFileRoute("/suscripcion")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Elige tu membresía · FITCORE" },
      {
        name: "description",
        content: "Selecciona tu plan mensual o anual de FITCORE y activa tu cuenta de entrenador.",
      },
      { property: "og:title", content: "Elige tu membresía · FITCORE" },
      { property: "og:description", content: "Planes mensuales y anuales para entrenadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionOnboarding,
});

type Cycle = "monthly" | "annual";

function SubscriptionOnboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { loading, session, user, role, subscription, signOut, refresh } = useAuth();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void router.navigate({ to: "/auth", replace: true });
      return;
    }
    if (role === "super_admin" || role === "client") {
      void router.navigate({ to: homeForRole(role), replace: true });
    }
  }, [loading, session, role, router]);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const choose = useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error("Sesión no válida");
      const plan = plans.find((p) => p.id === planId);
      const price = (cycle === "annual" ? plan?.annual_price : plan?.monthly_price) ?? 0;
      const today = new Date();
      const next = new Date(today);
      if (cycle === "annual") next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);

      const { error } = await supabase.from("trainer_subscriptions").insert({
        trainer_id: user.id,
        plan_id: planId,
        status: "pendiente",
        billing_cycle: cycle,
        price,
        started_at: today.toISOString().slice(0, 10),
        next_billing_at: next.toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Membresía seleccionada. Falta confirmar el pago.");
      await refresh();
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background bg-hero">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  const pending = subscription && subscription.status === "pendiente";

  return (
    <div className="min-h-screen bg-background bg-hero px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await signOut();
              void router.navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>

        {pending ? (
          <div className="card-surface mx-auto mt-12 max-w-lg p-6 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-neon">
              <CreditCard className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold">Pago pendiente de confirmación</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu membresía <span className="text-foreground">
                {plans.find((p) => p.id === subscription?.plan_id)?.name ?? ""}
              </span>{" "}
              ({subscription?.billing_cycle === "annual" ? "anual" : "mensual"}) queda activa en
              cuanto se registre el pago. Tus datos se conservan siempre.
            </p>
            <p className="mt-4 rounded-lg border border-border/70 bg-surface px-3 py-2 text-xs text-muted-foreground">
              Importe: {currency(subscription?.price ?? 0)} · Próximo cobro:{" "}
              {subscription?.next_billing_at ?? "—"}
            </p>
            <Button
              className="mt-6 w-full"
              onClick={async () => {
                await refresh();
                void router.navigate({ to: "/app", replace: true });
              }}
            >
              Comprobar mi acceso
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10 text-center">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Elige tu <span className="text-neon">membresía</span>
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Necesitas una membresía activa para gestionar clientes, rutinas y clases. Puedes
                cambiar de plan cuando quieras.
              </p>
              <div className="mt-6 inline-flex rounded-xl border border-border bg-surface p-1">
                {(["monthly", "annual"] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
                      cycle === c ? "bg-primary/20 text-neon" : "text-muted-foreground"
                    }`}
                  >
                    {c === "monthly" ? "Mensual" : "Anual"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {plans.map((p) => {
                const price = cycle === "annual" ? p.annual_price : p.monthly_price;
                const active = selected === p.id;
                return (
                  <div
                    key={p.id}
                    className={`card-surface flex flex-col p-5 transition-all ${
                      active ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{p.name}</h2>
                      {p.has_ai && (
                        <Badge variant="outline" className="border-primary/40 text-neon">
                          IA
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    <p className="mt-4 text-3xl font-semibold text-neon">
                      {currency(price ?? 0)}
                      <span className="text-sm text-muted-foreground">
                        /{cycle === "annual" ? "año" : "mes"}
                      </span>
                    </p>
                    <ul className="mt-4 space-y-1.5 text-sm">
                      {[
                        p.max_clients ? `${p.max_clients} clientes` : "Clientes ilimitados",
                        `${p.storage_gb} GB de almacenamiento`,
                        p.has_nutrition ? "Nutrición" : null,
                        p.has_reports ? "Informes" : null,
                        p.has_white_label ? "Marca propia" : null,
                      ]
                        .filter(Boolean)
                        .map((f) => (
                          <li key={String(f)} className="flex items-center gap-2 text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-neon" /> {f}
                          </li>
                        ))}
                    </ul>
                    <Button
                      className="mt-5 w-full"
                      disabled={choose.isPending}
                      onClick={() => {
                        setSelected(p.id);
                        choose.mutate(p.id);
                      }}
                    >
                      {choose.isPending && active && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Elegir {p.name}
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="mx-auto mt-8 flex max-w-xl items-start gap-2 rounded-xl border border-border/70 bg-surface px-4 py-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
              El cobro se procesa mediante una pasarela segura (compatible con Apple Pay). FITCORE
              nunca almacena números de tarjeta: los datos de pago se gestionan íntegramente en la
              pasarela.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
