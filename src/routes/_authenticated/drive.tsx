import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyFiles, registerFile, deleteFile, getDownloadUrl, getMyProfile } from "@/lib/files.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileIcon, Search, HardDrive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/drive")({
  head: () => ({ meta: [{ title: "Dosyalarım — Vaultly" }] }),
  component: DrivePage,
});

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function DrivePage() {
  const qc = useQueryClient();
  const fetchFiles = useServerFn(listMyFiles);
  const fetchProfile = useServerFn(getMyProfile);
  const register = useServerFn(registerFile);
  const remove = useServerFn(deleteFile);
  const downloadUrl = useServerFn(getDownloadUrl);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const { data: files = [] } = useQuery({ queryKey: ["files"], queryFn: () => fetchFiles() });
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState<{ name: string; progress: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const profile = me?.profile;
  const maxMb = me?.settings?.max_file_size_mb ?? 5120;
  const usedPct = profile ? Math.min(100, (profile.storage_used_bytes / (profile.storage_quota_mb * 1024 * 1024)) * 100) : 0;

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { file_id: id } }),
    onSuccess: () => {
      toast.success("Dosya silindi");
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error("Silinemedi", { description: e.message }),
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Dosya çok büyük (maks ${maxMb} MB)`);
      return;
    }
    if (profile && profile.storage_used_bytes + file.size > profile.storage_quota_mb * 1024 * 1024) {
      toast.error("Kota aşılacak");
      return;
    }
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return;
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    setUploading({ name: file.name, progress: 10 });
    const { error: upErr } = await supabase.storage.from("user-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (upErr) {
      setUploading(null);
      toast.error("Yükleme başarısız", { description: upErr.message });
      return;
    }
    setUploading({ name: file.name, progress: 80 });
    try {
      await register({
        data: {
          storage_path: path,
          name: file.name,
          size_bytes: file.size,
          mime_type: file.type || "application/octet-stream",
        },
      });
      toast.success("Yüklendi", { description: file.name });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      toast.error("Kayıt edilemedi", { description: err.message });
    } finally {
      setUploading(null);
    }
  }

  async function onDownload(id: string) {
    try {
      const { url } = await downloadUrl({ data: { file_id: id } });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error("İndirme bağlantısı alınamadı", { description: e.message });
    }
  }

  const filtered = files.filter((f: any) => f.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardDrive className="size-5" /> Dosyalarım</CardTitle>
            <CardDescription>{files.length} dosya · Maksimum tek dosya {maxMb} MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Dosya ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Button onClick={() => inputRef.current?.click()} disabled={!!uploading || !profile?.is_active}>
                <Upload className="size-4 mr-2" /> Yükle
              </Button>
              <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
            </div>
            {uploading && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm truncate">Yükleniyor: {uploading.name}</div>
                <Progress value={uploading.progress} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Depolama</CardTitle>
            <CardDescription>
              {profile ? `${fmtBytes(profile.storage_used_bytes)} / ${profile.storage_quota_mb} MB` : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={usedPct} />
            <p className="text-xs text-muted-foreground mt-2">%{usedPct.toFixed(1)} kullanıldı</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileIcon className="size-10 mx-auto mb-3 opacity-50" />
              {files.length === 0 ? "Henüz dosya yok. Yukarıdan yüklemeye başlayın." : "Eşleşen dosya bulunamadı."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((f: any) => (
                <li key={f.id} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                  <FileIcon className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtBytes(f.size_bytes)} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: tr })}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onDownload(f.id)}>
                    <Download className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm(`"${f.name}" silinsin mi?`)) delMut.mutate(f.id);
                  }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}