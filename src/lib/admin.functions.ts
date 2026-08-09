import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `Fit-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
}

async function rolesOf(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}

/** Crea la cuenta de acceso de un cliente existente y la vincula a su ficha. */
export const createClientAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        clientId: z.string().uuid(),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // El cliente debe ser visible para quien llama (RLS: su entrenador o super admin).
    const { data: client, error } = await context.supabase
      .from("clients")
      .select("id, full_name, user_id, trainer_id")
      .eq("id", data.clientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!client) throw new Error("Cliente no encontrado o sin permisos");
    if (client.user_id) throw new Error("Este cliente ya tiene acceso creado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = data.password ?? tempPassword();

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: client.full_name, role: "client" },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "No se pudo crear el usuario");

    await supabaseAdmin
      .from("clients")
      .update({ user_id: created.user.id, email: data.email })
      .eq("id", client.id);
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "client" }, { onConflict: "user_id,role" });

    return { userId: created.user.id, email: data.email, password };
  });

/** Crea un entrenador con su cuenta de acceso. Solo super admin. */
export const createTrainerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(120),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(40).optional(),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const roles = await rolesOf(context.supabase, context.userId);
    if (!roles.includes("super_admin")) throw new Error("Solo el administrador principal puede crear entrenadores");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = data.password ?? tempPassword();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: "trainer", phone: data.phone ?? null },
    });
    if (error || !created.user) throw new Error(error?.message ?? "No se pudo crear el entrenador");

    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName, email: data.email, phone: data.phone ?? null })
      .eq("id", created.user.id);
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "trainer" }, { onConflict: "user_id,role" });

    return { userId: created.user.id, email: data.email, password };
  });

/** Activa o deniega el acceso de un usuario. Solo super admin. */
export const setUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        enabled: z.boolean(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const roles = await rolesOf(context.supabase, context.userId);
    if (!roles.includes("super_admin")) throw new Error("Solo el administrador principal puede cambiar accesos");
    if (data.userId === context.userId) throw new Error("No puedes cambiar tu propio acceso");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ access_enabled: data.enabled, access_note: data.note ?? null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Restablece la contraseña de un usuario gestionado. Super admin o entrenador del cliente. */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await rolesOf(context.supabase, context.userId);
    let allowed = roles.includes("super_admin");
    if (!allowed) {
      const { data: client } = await context.supabase
        .from("clients")
        .select("id")
        .eq("user_id", data.userId)
        .maybeSingle();
      allowed = !!client;
    }
    if (!allowed) throw new Error("Sin permisos para restablecer esta contraseña");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = tempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password });
    if (error) throw new Error(error.message);
    return { password };
  });
