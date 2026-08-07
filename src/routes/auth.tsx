import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Logo } from "@/components/fitcore/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { homeForRole, useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceder a FITCORE" },
      {
        name: "description",
        content: "Inicia sesión o crea tu cuenta de entrenador en FITCORE.",
      },
      { property: "og:title", content: "Acceder a FITCORE" },
      { property: "og:description", content: "Inicia sesión o crea tu cuenta en FITCORE." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "recover";

const emailSchema = z.string().trim().email({ message: "Correo electrónico no válido" }).max(255);
const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .max(72);

function AuthPage() {
  const router = useRouter();
  const { session, role, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) void router.navigate({ to: homeForRole(role), replace: true });
  }, [loading, session, role, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.issues[0]?.message ?? "Correo no válido");
      return;
    }

    if (mode !== "recover") {
      const pwd = passwordSchema.safeParse(password);
      if (!pwd.success) {
        setError(pwd.error.issues[0]?.message ?? "Contraseña no válida");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password,
        });
        if (error) {
          setError(
            error.message.includes("Invalid login")
              ? "Correo o contraseña incorrectos."
              : error.message,
          );
          return;
        }
        toast.success("Bienvenido de nuevo");
      } else if (mode === "signup") {
        if (fullName.trim().length < 3) {
          setError("Escribe tu nombre completo");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: emailResult.data,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), role: "trainer" },
          },
        });
        if (error) {
          setError(
            error.message.includes("already registered")
              ? "Ya existe una cuenta con este correo."
              : error.message,
          );
          return;
        }
        if (!data.session) {
          setSent(true);
          toast.success("Revisa tu correo para confirmar tu cuenta");
          return;
        }
        toast.success("Cuenta creada");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(emailResult.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setError(error.message);
          return;
        }
        setSent(true);
        toast.success("Te enviamos un enlace de recuperación");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background bg-hero lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border p-10 lg:flex">
        <Logo size="lg" />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            El centro de operaciones de tu <span className="text-neon">negocio fitness</span>.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Clientes, evaluaciones, rutinas, progreso, nutrición, hábitos, check-ins, agenda y
            pagos. Todo en una sola plataforma.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { k: "Clientes", v: "Ilimitados" },
              { k: "Progreso", v: "En tiempo real" },
              { k: "Rutinas", v: "Profesionales" },
            ].map((i) => (
              <div key={i.k} className="card-surface p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.k}</p>
                <p className="mt-1 text-sm font-medium text-neon">{i.v}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FITCORE</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-rise-in">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" && "Inicia sesión"}
            {mode === "signup" && "Crea tu cuenta"}
            {mode === "recover" && "Recuperar contraseña"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login" && "Accede a tu espacio de trabajo FITCORE."}
            {mode === "signup" && "Empieza a gestionar a tus clientes hoy mismo."}
            {mode === "recover" && "Te enviaremos un enlace para restablecerla."}
          </p>

          {sent ? (
            <div className="mt-8 card-surface p-5 text-sm">
              <p className="font-medium text-neon">Revisa tu correo</p>
              <p className="mt-2 text-muted-foreground">
                Enviamos un mensaje a <span className="text-foreground">{email}</span> con los
                siguientes pasos.
              </p>
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => {
                  setSent(false);
                  setMode("login");
                }}
              >
                Volver a iniciar sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Carlos Martínez"
                    maxLength={100}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  maxLength={255}
                />
              </div>

              {mode !== "recover" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(Boolean(v))}
                    />
                    Recordarme
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("recover");
                      setError(null);
                    }}
                    className="text-sm text-neon transition-opacity hover:opacity-80"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" && "Entrar"}
                {mode === "signup" && "Crear cuenta"}
                {mode === "recover" && "Enviar enlace"}
              </Button>

              <p className="pt-2 text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    ¿No tienes cuenta?{" "}
                    <button
                      type="button"
                      className="text-neon"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                      }}
                    >
                      Crear cuenta
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{" "}
                    <button
                      type="button"
                      className="text-neon"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                      }}
                    >
                      Iniciar sesión
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
