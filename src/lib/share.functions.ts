import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import bcrypt from "bcryptjs";

function makeToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 28);
}

export const listMyShareLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("share_links")
      .select("id, file_id, token, expires_at, max_downloads, download_count, require_auth, is_revoked, password_hash, created_at, files:file_id(name, size_bytes)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((l: any) => ({ ...l, has_password: !!l.password_hash, password_hash: undefined }));
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_id: string; password?: string; expires_in_hours?: number | null; max_downloads?: number | null; require_auth?: boolean }) =>
    z.object({
      file_id: z.string().uuid(),
      password: z.string().min(4).max(128).optional(),
      expires_in_hours: z.number().int().positive().max(24 * 365).nullable().optional(),
      max_downloads: z.number().int().positive().max(100000).nullable().optional(),
      require_auth: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    // Ownership check via RLS
    const { data: file } = await context.supabase.from("files").select("id").eq("id", data.file_id).maybeSingle();
    if (!file) throw new Error("Dosya bulunamadı");

    const token = makeToken();
    const password_hash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const expires_at = data.expires_in_hours ? new Date(Date.now() + data.expires_in_hours * 3600 * 1000).toISOString() : null;

    const { data: row, error } = await context.supabase
      .from("share_links")
      .insert({
        owner_id: context.userId,
        file_id: data.file_id,
        token,
        password_hash,
        expires_at,
        max_downloads: data.max_downloads ?? null,
        require_auth: data.require_auth ?? false,
      })
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, token: row.token };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("share_links").update({ is_revoked: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("share_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public: get metadata about a share link (does NOT return URL).
export const getShareLinkInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("share_links")
      .select("id, file_id, expires_at, max_downloads, download_count, require_auth, is_revoked, password_hash, files:file_id(name, size_bytes, mime_type)")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) throw new Error("Bağlantı bulunamadı");
    if (link.is_revoked) throw new Error("Bu bağlantı iptal edilmiş");
    if (link.expires_at && new Date(link.expires_at) < new Date()) throw new Error("Bağlantının süresi dolmuş");
    if (link.max_downloads != null && link.download_count >= link.max_downloads) throw new Error("İndirme limitine ulaşıldı");
    const file: any = Array.isArray(link.files) ? link.files[0] : link.files;
    return {
      name: file?.name ?? "Dosya",
      size_bytes: file?.size_bytes ?? 0,
      mime_type: file?.mime_type ?? null,
      has_password: !!link.password_hash,
      require_auth: link.require_auth,
      expires_at: link.expires_at,
      remaining: link.max_downloads != null ? Math.max(0, link.max_downloads - link.download_count) : null,
    };
  });

// Redeem a share link → returns a short signed download URL.
export const redeemShareLink = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; password?: string }) =>
    z.object({ token: z.string().min(8).max(64), password: z.string().max(128).optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("share_links")
      .select("id, file_id, password_hash, expires_at, max_downloads, download_count, require_auth, is_revoked")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) throw new Error("Bağlantı bulunamadı");
    if (link.is_revoked) throw new Error("İptal edilmiş bağlantı");
    if (link.expires_at && new Date(link.expires_at) < new Date()) throw new Error("Süresi dolmuş");
    if (link.max_downloads != null && link.download_count >= link.max_downloads) throw new Error("İndirme limitine ulaşıldı");

    if (link.require_auth) {
      // Verify caller is signed in by reading the bearer
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth = getRequestHeader("authorization");
      const jwt = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!jwt) throw new Error("Bu bağlantı için giriş gerekli");
      const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(jwt);
      if (uErr || !u.user) throw new Error("Bu bağlantı için giriş gerekli");
    }

    if (link.password_hash) {
      if (!data.password) throw new Error("Parola gerekli");
      const ok = await bcrypt.compare(data.password, link.password_hash);
      if (!ok) throw new Error("Parola hatalı");
    }

    const { data: file } = await supabaseAdmin.from("files").select("storage_path, name").eq("id", link.file_id).maybeSingle();
    if (!file) throw new Error("Dosya bulunamadı");

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 60 * 5, { download: file.name });
    if (sErr) throw new Error(sErr.message);

    await supabaseAdmin.from("share_links").update({ download_count: link.download_count + 1 }).eq("id", link.id);

    return { url: signed.signedUrl, name: file.name };
  });