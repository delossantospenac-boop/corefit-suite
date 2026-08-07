import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

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
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  clientId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function homeForRole(role: AppRole | null): string {
  if (role === "super_admin") return "/admin";
  if (role === "client") return "/cliente";
  return "/app";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadContext(uid: string | undefined) {
    if (!uid) {
      setProfile(null);
      setRole(null);
      setClientId(null);
      return;
    }
    const [{ data: prof }, { data: roles }, { data: client }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("clients").select("id").eq("user_id", uid).limit(1).maybeSingle(),
    ]);
    setProfile((prof as Profile | null) ?? null);
    const list = (roles ?? []).map((r) => r.role as AppRole);
    const priority: AppRole[] = ["super_admin", "gym_admin", "trainer", "client"];
    setRole(priority.find((r) => list.includes(r)) ?? null);
    setClientId((client as { id: string } | null)?.id ?? null);
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

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    role,
    clientId,
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
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
