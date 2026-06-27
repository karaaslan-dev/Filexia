import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "./audit.functions";

// VirusTotal v3: lookup file report by SHA-256.
// Returns { found, stats, malicious, suspicious, harmless, undetected, permalink }.
async function vtLookup(sha256: string) {
  const key = process.env.VIRUSTOTAL_API_KEY;
  if (!key) throw new Error("VirusTotal yapılandırılmamış");
  const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
    headers: { "x-apikey": key, accept: "application/json" },
  });
  if (res.status === 404) return { found: false as const };
  if (!res.ok) throw new Error(`VirusTotal hatası: ${res.status}`);
  const json: any = await res.json();
  const stats = json?.data?.attributes?.last_analysis_stats ?? {};
  return {
    found: true as const,
    stats,
    malicious: stats.malicious ?? 0,
    suspicious: stats.suspicious ?? 0,
    harmless: stats.harmless ?? 0,
    undetected: stats.undetected ?? 0,
    permalink: `https://www.virustotal.com/gui/file/${sha256}`,
  };
}

export const checkVirusTotal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sha256: string }) =>
    z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/i) }).parse(d)
  )
  .handler(async ({ data }) => vtLookup(data.sha256.toLowerCase()));

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("id, email, display_name, storage_quota_mb, storage_used_bytes, is_active, must_change_password")
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: settings } = await context.supabase.from("app_settings").select("max_file_size_mb, allowed_mime_prefixes").eq("id", 1).single();
    return { profile, isAdmin: !!isAdmin, settings };
  });

export const listMyFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("files")
      .select("id, name, size_bytes, mime_type, created_at, storage_path, folder_id")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Validate and register a file already uploaded to storage. If validation fails,
// delete the uploaded object so storage doesn't drift from the files table.
export const registerFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storage_path: string; name: string; size_bytes: number; mime_type: string; folder_id?: string | null; sha256: string }) =>
    z.object({
      storage_path: z.string().min(1).max(512),
      name: z.string().min(1).max(255),
      size_bytes: z.number().int().positive(),
      mime_type: z.string().max(255),
      folder_id: z.string().uuid().nullable().optional(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    // Storage path must start with userId/
    if (!data.storage_path.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid storage path");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function cleanup() {
      await supabaseAdmin.storage.from("user-files").remove([data.storage_path]);
    }

    // VirusTotal zorunlu doğrulama
    let vt: any;
    try {
      vt = await vtLookup(data.sha256.toLowerCase());
    } catch (e: any) {
      await cleanup();
      throw new Error(`VirusTotal doğrulanamadı: ${e.message}`);
    }
    if (!vt.found) {
      await cleanup();
      throw new Error("Bu dosya VirusTotal'da bulunamadı. Lütfen önce virustotal.com adresine yükleyin, ardından tekrar deneyin.");
    }
    if ((vt.malicious ?? 0) > 0 || (vt.suspicious ?? 0) > 1) {
      await cleanup();
      throw new Error(`Güvenlik riski: VirusTotal ${vt.malicious} kötü amaçlı / ${vt.suspicious} şüpheli sonuç bildirdi. Yükleme reddedildi.`);
    }

    const { data: settings } = await context.supabase.from("app_settings").select("max_file_size_mb, allowed_mime_prefixes").eq("id", 1).single();
    const maxBytes = (settings?.max_file_size_mb ?? 5120) * 1024 * 1024;
    if (data.size_bytes > maxBytes) {
      await cleanup();
      throw new Error(`File exceeds maximum size of ${settings?.max_file_size_mb} MB`);
    }
    const allowed = settings?.allowed_mime_prefixes ?? [];
    if (allowed.length && !allowed.some((p: string) => data.mime_type.startsWith(p))) {
      await cleanup();
      throw new Error("File type not allowed");
    }

    const { data: profile } = await context.supabase.from("profiles").select("storage_quota_mb, storage_used_bytes, is_active").eq("id", context.userId).single();
    if (!profile?.is_active) {
      await cleanup();
      throw new Error("Account is inactive");
    }
    const quotaBytes = profile.storage_quota_mb * 1024 * 1024;
    if (profile.storage_used_bytes + data.size_bytes > quotaBytes) {
      await cleanup();
      throw new Error("Storage quota exceeded");
    }

    if (data.folder_id) {
      const { data: f } = await context.supabase.from("folders").select("id").eq("id", data.folder_id).eq("owner_id", context.userId).maybeSingle();
      if (!f) { await cleanup(); throw new Error("Klasör bulunamadı"); }
    }

    const { data: inserted, error } = await context.supabase
      .from("files")
      .insert({
        owner_id: context.userId,
        name: data.name,
        storage_path: data.storage_path,
        size_bytes: data.size_bytes,
        mime_type: data.mime_type,
        folder_id: data.folder_id ?? null,
        sha256: data.sha256.toLowerCase(),
        vt_stats: vt.stats ?? null,
        vt_scanned_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      await cleanup();
      throw new Error(error.message);
    }
    await logAudit({
      actorId: context.userId, actorEmail: context.claims?.email,
      action: "file.upload", resourceType: "file", resourceId: inserted.id,
      metadata: { name: data.name, size: data.size_bytes, mime: data.mime_type, vt: vt.stats ?? null },
    });
    return { id: inserted.id };
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_id: string }) => z.object({ file_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("files")
      .select("storage_path, name")
      .eq("id", data.file_id)
      .single();
    if (error || !file) throw new Error("File not found");
    const { data: signed, error: sErr } = await context.supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 60 * 5, { download: file.name });
    if (sErr) throw new Error(sErr.message);
    await logAudit({
      actorId: context.userId, actorEmail: context.claims?.email,
      action: "file.download", resourceType: "file", resourceId: data.file_id, metadata: { name: file.name },
    });
    return { url: signed.signedUrl };
  });

// Inline preview URL (no forced download) for PDF/image/video viewers.
export const getPreviewUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_id: string }) => z.object({ file_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("files").select("storage_path, name, mime_type").eq("id", data.file_id).single();
    if (error || !file) throw new Error("File not found");
    const { data: signed, error: sErr } = await context.supabase.storage
      .from("user-files").createSignedUrl(file.storage_path, 60 * 10);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, name: file.name, mime_type: file.mime_type };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_id: string }) => z.object({ file_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("files")
      .select("id, storage_path, owner_id")
      .eq("id", data.file_id)
      .single();
    if (error || !file) throw new Error("File not found");
    // RLS already restricts; admins handled separately via admin fns
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("user-files").remove([file.storage_path]);
    const { error: dErr } = await context.supabase.from("files").delete().eq("id", file.id);
    if (dErr) throw new Error(dErr.message);
    await logAudit({
      actorId: context.userId, actorEmail: context.claims?.email,
      action: "file.delete", resourceType: "file", resourceId: file.id,
    });
    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { new_password: string }) =>
    z.object({ new_password: z.string().min(8).max(128) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: false }).eq("id", context.userId);
    return { ok: true };
  });