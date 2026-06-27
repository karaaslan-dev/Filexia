import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, display_name, storage_quota_mb, storage_used_bytes, is_active, must_change_password, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const rolesMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });
    return (data ?? []).map((u: any) => ({ ...u, roles: rolesMap.get(u.id) ?? [] }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; display_name?: string; quota_mb?: number; is_admin?: boolean }) =>
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(128),
      display_name: z.string().trim().max(80).optional(),
      quota_mb: z.number().int().positive().max(1024 * 1024).optional(),
      is_admin: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.display_name ?? data.email.split("@")[0],
        must_change_password: true,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    if (data.quota_mb) {
      await supabaseAdmin.from("profiles").update({ storage_quota_mb: data.quota_mb }).eq("id", created.user.id);
    }
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    }
    return { id: created.user.id };
  });

export const updateUserQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; quota_mb: number }) =>
    z.object({ user_id: z.string().uuid(), quota_mb: z.number().int().positive().max(1024 * 1024) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ storage_quota_mb: data.quota_mb }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; is_active: boolean }) =>
    z.object({ user_id: z.string().uuid(), is_active: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_active: data.is_active }).eq("id", data.user_id);
    // Also ban/unban at auth level by setting a far-future ban duration
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.is_active ? "none" : "876000h",
    } as any);
    return { ok: true };
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; make_admin: boolean }) =>
    z.object({ user_id: z.string().uuid(), make_admin: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.make_admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      if (data.user_id === context.userId) throw new Error("Cannot remove your own admin role");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    }
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; new_password: string }) =>
    z.object({ user_id: z.string().uuid(), new_password: z.string().min(8).max(128) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", data.user_id);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Delete all storage objects for this user
    const { data: files } = await supabaseAdmin.from("files").select("storage_path").eq("owner_id", data.user_id);
    if (files && files.length) {
      await supabaseAdmin.storage.from("user-files").remove(files.map((f: any) => f.storage_path));
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("app_settings").select("*").eq("id", 1).single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { default_quota_mb: number; max_file_size_mb: number; allowed_mime_prefixes: string[] }) =>
    z.object({
      default_quota_mb: z.number().int().positive().max(1024 * 1024),
      max_file_size_mb: z.number().int().positive().max(1024 * 1024),
      allowed_mime_prefixes: z.array(z.string().max(64)).max(50),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("files")
      .select("id, name, size_bytes, mime_type, created_at, storage_path, owner_id, profiles:owner_id(email, display_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });