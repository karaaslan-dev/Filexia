import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("folders")
      .select("id, name, parent_id, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; parent_id: string | null }) =>
    z.object({
      name: z.string().trim().min(1).max(120).regex(/^[^/\\]+$/, "Klasör adı / veya \\ içeremez"),
      parent_id: z.string().uuid().nullable(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    if (data.parent_id) {
      const { data: parent } = await context.supabase.from("folders").select("id").eq("id", data.parent_id).eq("owner_id", context.userId).maybeSingle();
      if (!parent) throw new Error("Üst klasör bulunamadı");
    }
    const { data: row, error } = await context.supabase
      .from("folders")
      .insert({ name: data.name, parent_id: data.parent_id, owner_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message.includes("folders_owner_id_parent_id_name_key") ? "Bu isimde bir klasör zaten var" : error.message);
    return { id: row.id };
  });

export const renameFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120).regex(/^[^/\\]+$/) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("folders").update({ name: data.name }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Recursively gather all descendant folder ids
    const allIds = new Set<string>([data.id]);
    let frontier = [data.id];
    while (frontier.length) {
      const { data: kids } = await context.supabase.from("folders").select("id").in("parent_id", frontier);
      const next: string[] = [];
      for (const k of kids ?? []) {
        if (!allIds.has(k.id)) { allIds.add(k.id); next.push(k.id); }
      }
      frontier = next;
    }
    const ids = Array.from(allIds);
    // Collect files in these folders
    const { data: files } = await context.supabase.from("files").select("id, storage_path").in("folder_id", ids);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (files && files.length) {
      await supabaseAdmin.storage.from("user-files").remove(files.map((f: any) => f.storage_path));
      await context.supabase.from("files").delete().in("id", files.map((f: any) => f.id));
    }
    const { error } = await context.supabase.from("folders").delete().in("id", ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted_folders: ids.length, deleted_files: files?.length ?? 0 };
  });

export const moveItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_ids: string[]; folder_ids: string[]; target_folder_id: string | null }) =>
    z.object({
      file_ids: z.array(z.string().uuid()).max(500),
      folder_ids: z.array(z.string().uuid()).max(500),
      target_folder_id: z.string().uuid().nullable(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    if (data.target_folder_id) {
      const { data: t } = await context.supabase.from("folders").select("id").eq("id", data.target_folder_id).eq("owner_id", context.userId).maybeSingle();
      if (!t) throw new Error("Hedef klasör bulunamadı");
      // prevent moving a folder into its own descendant
      if (data.folder_ids.length) {
        const desc = new Set<string>(data.folder_ids);
        let frontier = [...data.folder_ids];
        while (frontier.length) {
          const { data: kids } = await context.supabase.from("folders").select("id").in("parent_id", frontier);
          const next: string[] = [];
          for (const k of kids ?? []) if (!desc.has(k.id)) { desc.add(k.id); next.push(k.id); }
          frontier = next;
        }
        if (desc.has(data.target_folder_id)) throw new Error("Bir klasör kendi alt klasörüne taşınamaz");
      }
    }
    if (data.file_ids.length) {
      const { error } = await context.supabase.from("files").update({ folder_id: data.target_folder_id }).in("id", data.file_ids);
      if (error) throw new Error(error.message);
    }
    if (data.folder_ids.length) {
      const { error } = await context.supabase.from("folders").update({ parent_id: data.target_folder_id }).in("id", data.folder_ids);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const bulkDeleteFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_ids: string[] }) =>
    z.object({ file_ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: files, error } = await context.supabase.from("files").select("id, storage_path").in("id", data.file_ids);
    if (error) throw new Error(error.message);
    if (!files?.length) return { ok: true, deleted: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("user-files").remove(files.map((f: any) => f.storage_path));
    const { error: dErr } = await context.supabase.from("files").delete().in("id", files.map((f: any) => f.id));
    if (dErr) throw new Error(dErr.message);
    return { ok: true, deleted: files.length };
  });

export const getBulkDownloadUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { file_ids: string[] }) =>
    z.object({ file_ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: files, error } = await context.supabase
      .from("files")
      .select("id, name, storage_path, folder_id")
      .in("id", data.file_ids);
    if (error) throw new Error(error.message);
    if (!files?.length) return { items: [] };

    // Build folder path map for these files
    const folderIds = Array.from(new Set(files.map((f: any) => f.folder_id).filter(Boolean))) as string[];
    const pathMap = new Map<string, string>();
    if (folderIds.length) {
      const { data: all } = await context.supabase.from("folders").select("id, name, parent_id");
      const byId = new Map<string, any>((all ?? []).map((f: any) => [f.id, f]));
      function pathOf(id: string): string {
        const seen = new Set<string>();
        const parts: string[] = [];
        let cur: any = byId.get(id);
        while (cur && !seen.has(cur.id)) {
          seen.add(cur.id);
          parts.unshift(cur.name);
          cur = cur.parent_id ? byId.get(cur.parent_id) : null;
        }
        return parts.join("/");
      }
      for (const id of folderIds) pathMap.set(id, pathOf(id));
    }

    const items = await Promise.all(
      files.map(async (f: any) => {
        const { data: signed } = await context.supabase.storage
          .from("user-files")
          .createSignedUrl(f.storage_path, 60 * 10);
        const folderPath = f.folder_id ? pathMap.get(f.folder_id) ?? "" : "";
        return { id: f.id, name: f.name, path: folderPath ? `${folderPath}/${f.name}` : f.name, url: signed?.signedUrl ?? null };
      })
    );
    return { items };
  });