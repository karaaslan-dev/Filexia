import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-only helper to write an audit entry. Best-effort: never throw to caller.
export async function logAudit(opts: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: opts.actorId ?? null,
      actor_email: opts.actorEmail ?? null,
      action: opts.action,
      resource_type: opts.resourceType ?? null,
      resource_id: opts.resourceId ?? null,
      metadata: opts.metadata ?? null,
      ip: opts.ip ?? null,
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }
}

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { limit?: number; action?: string }) =>
    z.object({
      limit: z.number().int().positive().max(500).optional(),
      action: z.string().max(64).optional(),
    }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    let q = context.supabase
      .from("audit_logs")
      .select("id, actor_id, actor_email, action, resource_type, resource_id, metadata, ip, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });