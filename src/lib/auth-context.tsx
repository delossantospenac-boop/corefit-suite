import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_UNITS, type DistanceUnit, type LengthUnit, type UnitPrefs, type WeightUnit } from "@/lib/units";

export type AppRole = "super_admin" | "gym_admin" | "trainer" | "client";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  gym_id: string | null;
  brand_name: string | null;
  brand_color: string | null;
  brand_logo_url: string | null;
  bio: string | null;
  active: boolean;
  access_enabled: boolean;
  access_note: string | null;
  unit_weight: string;
  unit_length: string;
  unit_distance: string;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  clientId: string | null;
  units: UnitPrefs;
  subscriptionStatus: string | null;
  subscription: TrainerSubscription | null;
  /** El entrenador aún no ha elegido/pagado una membresía. */
  needsSubscription: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export type TrainerSubscription = {
  id: string;
  plan_id: string | null;
  status: string;
  billing_cycle: string;
  price: number | null;
  next_billing_at: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function homeForRole(role: AppRole | null): string {
  if (role === "super_admin") return "/admin";
  if (role === "client") return "/cliente";
  return "/app";
}

/** Motivo por el que el acceso está bloqueado, o null si puede entrar. */
function isExpired(nextBillingAt: string | null | undefined): boolean {
  if (!nextBillingAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return nextBillingAt < today;
}

/** true si el entrenador todavía no tiene una membresía elegida. */
export function trainerNeedsSubscription(
  role: AppRole | null,
  subscription: TrainerSubscription | null,
): boolean {
  if (role !== "trainer" && role !== "gym_admin") return false;
  return subscription === null;
}

export function accessBlockReason(
  role: AppRole | null,
  profile: Profile | null,
  subscription: TrainerSubscription | null,
): string | null {
  if (!role || role === "super_admin") return null;
  if (profile && profile.access_enabled === false) {
    return (
      profile.access_note ||
      "Tu acceso a la plataforma está actualmente suspendido. Contacta con el administrador."
    );
  }
  if (role === "trainer" || role === "gym_admin") {
    if (!subscription) return null; // se resuelve con el alta de membresía, no bloqueando
    if (subscription.status === "vencido" || isExpired(subscription.next_billing_at))
      return "Tu suscripción está vencida. Renueva tu membresía para recuperar el acceso. Tus datos y clientes se conservan intactos.";
    if (subscription.status === "cancelado")
      return "Tu suscripción ha sido cancelada. Contacta con el administrador para reactivar tu acceso.";
    if (subscription.status === "pendiente")
      return "Tu pago de membresía está pendiente de confirmación. En cuanto se registre el pago tendrás acceso completo.";
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<TrainerSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadContext(uid: string | undefined) {
    if (!uid) {
      setProfile(null);
      setRole(null);
      setClientId(null);
      setSubscription(null);
      return;
    }
    const [{ data: prof }, { data: roles }, { data: client }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("clients").select("id").eq("user_id", uid).limit(1).maybeSingle(),
      supabase
        .from("trainer_subscriptions")
        .select("id, plan_id, status, billing_cycle, price, next_billing_at")
        .eq("trainer_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setProfile((prof as Profile | null) ?? null);
    const list = (roles ?? []).map((r) => r.role as AppRole);
    const priority: AppRole[] = ["super_admin", "gym_admin", "trainer", "client"];
    setRole(priority.find((r) => list.includes(r)) ?? null);
    setClientId((client as { id: string } | null)?.id ?? null);
    setSubscription((sub as TrainerSubscription | null) ?? null);
  }

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        setSession(next);
        return;
      }
      setSession(next);
      void loadContext(next?.user?.id).then(() => {
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      await loadContext(data.session?.user?.id);
      setLoading(false);
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const units: UnitPrefs = profile
    ? {
        weight: (profile.unit_weight as WeightUnit) ?? DEFAULT_UNITS.weight,
        length: (profile.unit_length as LengthUnit) ?? DEFAULT_UNITS.length,
        distance: (profile.unit_distance as DistanceUnit) ?? DEFAULT_UNITS.distance,
      }
    : DEFAULT_UNITS;

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    role,
    clientId,
    units,
    subscriptionStatus: subscription?.status ?? null,
    subscription,
    needsSubscription: trainerNeedsSubscription(
      (["super_admin", "gym_admin", "trainer", "client"] as AppRole[]).find((r) => r === role) ??
        null,
      subscription,
    ),
    refresh: async () => {
      await loadContext(session?.user?.id);
    },
    signOut: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      setProfile(null);
      setRole(null);
      setClientId(null);
      setSubscription(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export function useUnits(): UnitPrefs {
  return useAuth().units;
}
