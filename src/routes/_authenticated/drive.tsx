import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyFiles, registerFile, deleteFile, getDownloadUrl, getMyProfile, checkVirusTotal, getPreviewUrl } from "@/lib/files.functions";
import {
  listMyFolders, createFolder, renameFolder, deleteFolder,
  bulkDeleteFiles, getBulkDownloadUrls,
} from "@/lib/folders.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Upload, Download, Trash2, FileIcon, Search, HardDrive, FolderPlus,
  Folder, ChevronRight, Home, Pencil, X, Archive, Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import JSZip from "jszip";
import {
  createShareLink, listMyShareLinks, revokeShareLink, deleteShareLink,
} from "@/lib/share.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Ban, ExternalLink } from "lucide-react";
import { useT, useLang } from "@/lib/i18n";
import { enUS } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/drive")({
  head: () => ({ meta: [{ title: "Dosyalarım — Filexa" }] }),
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
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "tr" ? tr : enUS;
  const fetchFiles = useServerFn(listMyFiles);
  const fetchFolders = useServerFn(listMyFolders);
  const fetchProfile = useServerFn(getMyProfile);
  const register = useServerFn(registerFile);
  const removeOne = useServerFn(deleteFile);
  const downloadUrl = useServerFn(getDownloadUrl);
  const vtCheck = useServerFn(checkVirusTotal);
  const previewUrl = useServerFn(getPreviewUrl);
  const mkFolder = useServerFn(createFolder);
  const renameFolderFn = useServerFn(renameFolder);
  const rmFolder = useServerFn(deleteFolder);
  const bulkDel = useServerFn(bulkDeleteFiles);
  const bulkUrls = useServerFn(getBulkDownloadUrls);
  const fetchLinks = useServerFn(listMyShareLinks);
  const mkShare = useServerFn(createShareLink);
  const revokeLink = useServerFn(revokeShareLink);
  const delLink = useServerFn(deleteShareLink);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const { data: files = [] } = useQuery({ queryKey: ["files"], queryFn: () => fetchFiles() });
  const { data: folders = [] } = useQuery({ queryKey: ["folders"], queryFn: () => fetchFolders() });

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selFiles, setSelFiles] = useState<Set<string>>(new Set());
  const [selFolders, setSelFolders] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<{ name: string; progress: number } | null>(null);
  const [vtStatus, setVtStatus] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [shareFor, setShareFor] = useState<{ id: string; name: string } | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const profile = me?.profile;
  const maxMb = me?.settings?.max_file_size_mb ?? 5120;
  const usedPct = profile ? Math.min(100, (profile.storage_used_bytes / (profile.storage_quota_mb * 1024 * 1024)) * 100) : 0;

  // Breadcrumb path
  const breadcrumb = useMemo(() => {
    const byId = new Map<string, any>((folders as any[]).map((f) => [f.id, f]));
    const path: any[] = [];
    let cur = currentFolderId ? byId.get(currentFolderId) : null;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) { seen.add(cur.id); path.unshift(cur); cur = cur.parent_id ? byId.get(cur.parent_id) : null; }
    return path;
  }, [folders, currentFolderId]);

  const childFolders = (folders as any[]).filter((f) => f.parent_id === currentFolderId);
  const childFiles = (files as any[]).filter((f) => (f.folder_id ?? null) === currentFolderId);

  const visibleFolders = childFolders.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  const visibleFiles = childFiles.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  function navigateTo(id: string | null) {
    setCurrentFolderId(id);
    setSelFiles(new Set());
    setSelFolders(new Set());
  }

  function toggleFile(id: string) {
    setSelFiles((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleFolder(id: string) {
    setSelFolders((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selFiles.size + selFolders.size > 0) { setSelFiles(new Set()); setSelFolders(new Set()); }
    else { setSelFiles(new Set(visibleFiles.map((f) => f.id))); setSelFolders(new Set(visibleFolders.map((f) => f.id))); }
  }

  const delMut = useMutation({
    mutationFn: (id: string) => removeOne({ data: { file_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) { toast.error(t("drive.tooLarge", maxMb)); return; }
    if (profile && profile.storage_used_bytes + file.size > profile.storage_quota_mb * 1024 * 1024) {
      toast.error(t("drive.quotaExceed")); return;
    }
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return;

    // 1) SHA-256 hesapla
    setUploading({ name: file.name, progress: 2 });
    setVtStatus(t("drive.sha"));
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const sha256 = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // 2) VirusTotal ön-kontrol
    setVtStatus(t("drive.vtCheck"));
    try {
      const vt: any = await vtCheck({ data: { sha256 } });
      if (!vt.found) {
        setUploading(null); setVtStatus(null);
        toast.error(t("drive.vtRequired"), {
          description: t("drive.vtRequiredDesc"),
          action: { label: t("drive.vtOpen"), onClick: () => window.open("https://www.virustotal.com/gui/home/upload", "_blank") },
        });
        return;
      }
      if ((vt.malicious ?? 0) > 0 || (vt.suspicious ?? 0) > 1) {
        setUploading(null); setVtStatus(null);
        toast.error(t("drive.vtRisk"), { description: t("drive.vtRiskDesc", vt.malicious, vt.suspicious) });
        return;
      }
      setVtStatus(t("drive.vtClean", vt.harmless + vt.undetected));
    } catch (e: any) {
      setUploading(null); setVtStatus(null);
      toast.error(t("drive.vtFailed"), { description: e.message });
      return;
    }

    const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    setUploading({ name: file.name, progress: 30 });
    const { error: upErr } = await supabase.storage.from("user-files").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream",
    });
    if (upErr) { setUploading(null); setVtStatus(null); toast.error(t("drive.uploadFailed"), { description: upErr.message }); return; }
    setUploading({ name: file.name, progress: 80 });
    try {
      await register({
        data: {
          storage_path: path, name: file.name, size_bytes: file.size,
          mime_type: file.type || "application/octet-stream",
          folder_id: currentFolderId,
          sha256,
        },
      });
      toast.success(t("drive.uploaded"), { description: file.name });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      toast.error(t("drive.registerFailed"), { description: err.message });
    } finally { setUploading(null); setVtStatus(null); }
  }

  async function onDownload(id: string) {
    try {
      const { url } = await downloadUrl({ data: { file_id: id } });
      // Use an anchor click to avoid Chrome's popup blocker for async window.open
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      a.target = "_blank";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) { toast.error(t("drive.dlUrlFailed"), { description: e.message }); }
  }

  function isPreviewable(mime: string) {
    return mime?.startsWith("image/") || mime?.startsWith("video/") || mime?.startsWith("audio/") || mime === "application/pdf" || mime?.startsWith("text/");
  }

  async function onPreview(id: string, mime: string) {
    if (!isPreviewable(mime)) { toast.info(t("drive.notPreviewable")); return; }
    try {
      const r: any = await previewUrl({ data: { file_id: id } });
      setPreview({ url: r.url, name: r.name, mime: r.mime_type });
    } catch (e: any) { toast.error(t("drive.previewFailed"), { description: e.message }); }
  }

  async function onBulkDelete() {
    if (!selFiles.size && !selFolders.size) return;
    const n = selFiles.size + selFolders.size;
    if (!confirm(t("drive.confirmBulk", n))) return;
    try {
      if (selFiles.size) await bulkDel({ data: { file_ids: Array.from(selFiles) } });
      for (const fid of selFolders) await rmFolder({ data: { id: fid } });
      toast.success(t("drive.bulkDeleted", n));
      setSelFiles(new Set()); setSelFolders(new Set());
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) { toast.error(t("drive.deleteFailed"), { description: e.message }); }
  }

  async function onBulkZip() {
    if (!selFiles.size) { toast.info(t("drive.zipPickFiles")); return; }
    setZipping(true);
    try {
      const { items } = await bulkUrls({ data: { file_ids: Array.from(selFiles) } });
      const zip = new JSZip();
      let done = 0;
      await Promise.all(items.map(async (it: any) => {
        if (!it.url) return;
        const res = await fetch(it.url);
        const buf = await res.arrayBuffer();
        zip.file(it.path, buf);
        done++;
      }));
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `filexa-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(t("drive.zipDone", done));
    } catch (e: any) {
      toast.error(t("drive.zipFailed"), { description: e.message });
    } finally { setZipping(false); }
  }

  async function onNewFolder() {
    const name = prompt(t("drive.newFolderPrompt"));
    if (!name) return;
    try {
      await mkFolder({ data: { name: name.trim(), parent_id: currentFolderId } });
      qc.invalidateQueries({ queryKey: ["folders"] });
    } catch (e: any) { toast.error(t("drive.newFolderFailed"), { description: e.message }); }
  }

  async function onRenameFolder(id: string, oldName: string) {
    const name = prompt(t("drive.renamePrompt"), oldName);
    if (!name || name === oldName) return;
    try {
      await renameFolderFn({ data: { id, name: name.trim() } });
      qc.invalidateQueries({ queryKey: ["folders"] });
    } catch (e: any) { toast.error(t("drive.renameFailed"), { description: e.message }); }
  }

  const anySelected = selFiles.size + selFolders.size > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><HardDrive className="size-5 shrink-0" /> {t("drive.title")}</CardTitle>
            <CardDescription>{t("drive.summary", files.length, folders.length, maxMb)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder={t("drive.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onNewFolder} className="flex-1 sm:flex-none">
                  <FolderPlus className="size-4 sm:mr-2" /><span className="hidden sm:inline">{t("drive.folder")}</span>
                </Button>
                <Button onClick={() => inputRef.current?.click()} disabled={!!uploading || !profile?.is_active} className="flex-1 sm:flex-none">
                  <Upload className="size-4 sm:mr-2" /><span className="hidden sm:inline">{t("drive.upload")}</span>
                </Button>
                <Button variant="outline" onClick={() => setLinksOpen(true)} className="flex-1 sm:flex-none" title={t("drive.sharesTitle")}>
                  <Share2 className="size-4 sm:mr-2" /><span className="hidden sm:inline">{t("drive.shares")}</span>
                </Button>
                <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
              </div>
            </div>
            {uploading && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm truncate">{t("drive.uploading", uploading.name)}</div>
                {vtStatus && <div className="text-xs text-muted-foreground">{vtStatus}</div>}
                <Progress value={uploading.progress} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">{t("drive.storage")}</CardTitle>
            <CardDescription>{profile ? `${fmtBytes(profile.storage_used_bytes)} / ${profile.storage_quota_mb} MB` : "—"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={usedPct} />
            <p className="text-xs text-muted-foreground mt-2">{t("drive.storageUsed", usedPct.toFixed(1))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <button onClick={() => navigateTo(null)} className="flex items-center gap-1 hover:underline">
          <Home className="size-4" /> {t("drive.root")}
        </button>
        {breadcrumb.map((b) => (
          <span key={b.id} className="flex items-center gap-1">
            <ChevronRight className="size-3 text-muted-foreground" />
            <button onClick={() => navigateTo(b.id)} className="hover:underline truncate max-w-[140px]">{b.name}</button>
          </span>
        ))}
      </div>

      {/* Bulk action bar */}
      {anySelected && (
        <div className="sticky top-16 z-30 rounded-lg border bg-card shadow-sm p-3 flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => { setSelFiles(new Set()); setSelFolders(new Set()); }}>
            <X className="size-4" />
          </Button>
          <span className="text-sm font-medium">{t("drive.selected", selFiles.size + selFolders.size)}</span>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={!selFiles.size || zipping} onClick={onBulkZip}>
              <Archive className="size-4 mr-1" /> {zipping ? t("drive.zipPreparing") : t("drive.zipDownload")}
            </Button>
            <Button size="sm" variant="destructive" onClick={onBulkDelete}>
              <Trash2 className="size-4 mr-1" /> {t("common.delete")}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileIcon className="size-10 mx-auto mb-3 opacity-50" />
              {childFolders.length + childFiles.length === 0
                ? t("drive.emptyFolder")
                : t("drive.noMatch")}
            </div>
          ) : (
            <ul className="divide-y">
              <li className="flex items-center gap-3 p-3 bg-muted/30 text-xs text-muted-foreground">
                <Checkbox checked={anySelected && (selFiles.size + selFolders.size) === (visibleFiles.length + visibleFolders.length)} onCheckedChange={toggleAll} />
                <span>{t("drive.selectAll")}</span>
              </li>
              {visibleFolders.map((f) => (
                <li key={`d-${f.id}`} className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 p-3 sm:p-4 hover:bg-muted/40">
                  <Checkbox checked={selFolders.has(f.id)} onCheckedChange={() => toggleFolder(f.id)} />
                  <Folder className="size-5 text-primary shrink-0" />
                  <button onClick={() => navigateTo(f.id)} className="text-left min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{t("drive.folder")}</div>
                  </button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onRenameFolder(f.id, f.name)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(t("drive.confirmDeleteFolder", f.name))) return;
                      try {
                        await rmFolder({ data: { id: f.id } });
                        toast.success(t("drive.folderDeleted"));
                        qc.invalidateQueries({ queryKey: ["folders"] });
                        qc.invalidateQueries({ queryKey: ["files"] });
                        qc.invalidateQueries({ queryKey: ["me"] });
                      } catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
              {visibleFiles.map((f: any) => (
                <li key={`f-${f.id}`} className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 p-3 sm:p-4 hover:bg-muted/40">
                  <Checkbox checked={selFiles.has(f.id)} onCheckedChange={() => toggleFile(f.id)} />
                  <FileIcon className="size-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fmtBytes(f.size_bytes)} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: dateLocale })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {isPreviewable(f.mime_type) && (
                      <Button size="sm" variant="ghost" title={t("drive.preview")} onClick={() => onPreview(f.id, f.mime_type)}>
                        <Eye className="size-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onDownload(f.id)}><Download className="size-4" /></Button>
                    <Button size="sm" variant="ghost" title={t("drive.share")} onClick={() => setShareFor({ id: f.id, name: f.name })}>
                      <Share2 className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(t("drive.confirmDeleteFile", f.name))) delMut.mutate(f.id, {
                        onSuccess: () => toast.success(t("drive.fileDeleted")),
                        onError: (e: any) => toast.error(t("drive.deleteFailed"), { description: e.message }),
                      });
                    }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {shareFor && (
        <ShareDialog
          file={shareFor}
          onClose={() => setShareFor(null)}
          createLink={(payload) => mkShare({ data: { file_id: shareFor.id, ...payload } })}
        />
      )}

      <MyLinksDialog
        open={linksOpen}
        onOpenChange={setLinksOpen}
        fetchLinks={() => fetchLinks()}
        revoke={(id) => revokeLink({ data: { id } })}
        remove={(id) => delLink({ data: { id } })}
      />

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.mime}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="w-full bg-muted/30 rounded overflow-hidden">
              {preview.mime.startsWith("image/") && (
                <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain" />
              )}
              {preview.mime === "application/pdf" && (
                <iframe
                  src={preview.url}
                  className="w-full h-[75vh] bg-background"
                  title={preview.name}
                />
              )}
              {preview.mime.startsWith("video/") && (
                <video src={preview.url} controls className="w-full max-h-[70vh]" />
              )}
              {preview.mime.startsWith("audio/") && (
                <audio src={preview.url} controls className="w-full p-6" />
              )}
              {preview.mime.startsWith("text/") && (
                <iframe src={preview.url} className="w-full h-[70vh] bg-background" title={preview.name} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShareDialog({
  file, onClose, createLink,
}: { file: { id: string; name: string }; onClose: () => void; createLink: (p: { password?: string; expires_in_hours?: number | null; max_downloads?: number | null; require_auth?: boolean }) => Promise<{ token: string }>; }) {
  const t = useT();
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [useExpiry, setUseExpiry] = useState(true);
  const [expiresHours, setExpiresHours] = useState("24");
  const [useLimit, setUseLimit] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState("10");
  const [requireAuth, setRequireAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function onCreate() {
    setBusy(true);
    try {
      const { token } = await createLink({
        password: usePassword && password ? password : undefined,
        expires_in_hours: useExpiry ? Number(expiresHours) : null,
        max_downloads: useLimit ? Number(maxDownloads) : null,
        require_auth: requireAuth,
      });
      const url = `${window.location.origin}/s/${token}`;
      setResultUrl(url);
      toast.success(t("sd.created"));
    } catch (e: any) {
      toast.error(t("sd.createFailed"), { description: e.message });
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sd.title")}</DialogTitle>
          <DialogDescription className="truncate">{file.name}</DialogDescription>
        </DialogHeader>
        {resultUrl ? (
          <div className="space-y-3">
            <Label>{t("sd.link")}</Label>
            <div className="flex gap-2">
              <Input readOnly value={resultUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success(t("common.copied")); }}>
                <Copy className="size-4" />
              </Button>
              <Button variant="outline" onClick={() => window.open(resultUrl, "_blank")}>
                <ExternalLink className="size-4" />
              </Button>
            </div>
            <DialogFooter><Button onClick={onClose}>{t("common.close")}</Button></DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><Label>{t("sd.pwProt")}</Label><p className="text-xs text-muted-foreground">{t("sd.pwProtDesc")}</p></div>
              <Switch checked={usePassword} onCheckedChange={setUsePassword} />
            </div>
            {usePassword && <Input type="text" placeholder={t("sd.pwInput")} value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} />}

            <div className="flex items-center justify-between gap-3">
              <div><Label>{t("sd.expiry")}</Label><p className="text-xs text-muted-foreground">{t("sd.expiryDesc")}</p></div>
              <Switch checked={useExpiry} onCheckedChange={setUseExpiry} />
            </div>
            {useExpiry && (
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} className="w-32" />
                <span className="text-sm text-muted-foreground">{t("common.hours")}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div><Label>{t("sd.limit")}</Label><p className="text-xs text-muted-foreground">{t("sd.limitDesc")}</p></div>
              <Switch checked={useLimit} onCheckedChange={setUseLimit} />
            </div>
            {useLimit && (
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} className="w-32" />
                <span className="text-sm text-muted-foreground">{t("common.downloads")}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div><Label>{t("sd.authOnly")}</Label><p className="text-xs text-muted-foreground">{t("sd.authOnlyDesc")}</p></div>
              <Switch checked={requireAuth} onCheckedChange={setRequireAuth} />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
              <Button onClick={onCreate} disabled={busy || (usePassword && password.length < 4)}>
                {busy ? t("sd.creating") : t("sd.createBtn")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MyLinksDialog({
  open, onOpenChange, fetchLinks, revoke, remove,
}: { open: boolean; onOpenChange: (v: boolean) => void; fetchLinks: () => Promise<any[]>; revoke: (id: string) => Promise<any>; remove: (id: string) => Promise<any>; }) {
  const qc = useQueryClient();
  const t = useT();
  const { lang } = useLang();
  const { data: links = [], refetch } = useQuery({
    queryKey: ["share-links"],
    queryFn: () => fetchLinks(),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("ml.title")}</DialogTitle>
          <DialogDescription>{t("ml.count", links.length)}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 divide-y">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("ml.empty")}</p>
          ) : links.map((l: any) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${l.token}`;
            const expired = l.expires_at && new Date(l.expires_at) < new Date();
            const exhausted = l.max_downloads != null && l.download_count >= l.max_downloads;
            return (
              <div key={l.id} className="py-3 space-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-medium truncate flex-1">{l.files?.name ?? t("ml.file")}</div>
                  {l.is_revoked && <span className="text-xs text-destructive">{t("ml.revoked")}</span>}
                  {!l.is_revoked && expired && <span className="text-xs text-destructive">{t("ml.expired")}</span>}
                  {!l.is_revoked && !expired && exhausted && <span className="text-xs text-destructive">{t("ml.exhausted")}</span>}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  {l.has_password && <span>{t("ml.pw")}</span>}
                  {l.require_auth && <span>{t("ml.members")}</span>}
                  {l.expires_at && <span>⏱ {new Date(l.expires_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</span>}
                  <span>↓ {l.download_count}{l.max_downloads ? ` / ${l.max_downloads}` : ""}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Input readOnly value={url} className="h-8 text-xs flex-1 min-w-0" onFocus={(e) => e.currentTarget.select()} />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success(t("common.copied")); }}>
                    <Copy className="size-4" />
                  </Button>
                  {!l.is_revoked && (
                    <Button size="sm" variant="outline" onClick={async () => { await revoke(l.id); toast.success(t("ml.cancelled")); refetch(); qc.invalidateQueries({ queryKey: ["share-links"] }); }}>
                      <Ban className="size-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={async () => { if (!confirm(t("ml.revokeConfirm"))) return; await remove(l.id); toast.success(t("common.deleted")); refetch(); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}