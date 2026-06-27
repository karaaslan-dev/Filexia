import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const setupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { needsSetup: (count ?? 0) === 0 };
});

export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; display_name?: string }) =>
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(128),
      display_name: z.string().trim().max(80).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Setup already completed");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name ?? data.email.split("@")[0], must_change_password: false },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed");
    await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });