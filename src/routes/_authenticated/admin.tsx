import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listUsers, createUser, updateUserQuota, setUserActive, setUserAdmin,
  resetUserPassword, deleteUser, getSettings, updateSettings, listAllFiles,
} from "@/lib/admin.functions";
import { deleteFile } from "@/lib/files.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, KeyRound, Trash2, ShieldCheck, ShieldOff, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Yönetim — Vaultly" }] }),
  component: AdminPage,
});

function fmtBytes(b: number) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function AdminPage() {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
        <TabsTrigger value="files">Tüm Dosyalar</TabsTrigger>
        <TabsTrigger value="settings">Sistem Ayarları</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
      <TabsContent value="files" className="mt-6"><FilesTab /></TabsContent>
      <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
    </Tabs>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const setQuota = useServerFn(updateUserQuota);
  const setActive = useServerFn(setUserActive);
  const setAdmin = useServerFn(setUserAdmin);
  const resetPw = useServerFn(resetUserPassword);
  const del = useServerFn(deleteUser);

  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", display_name: "", quota_mb: "", is_admin: false });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create({
        data: {
          email: form.email.trim(),
          password: form.password,
          display_name: form.display_name || undefined,
          quota_mb: form.quota_mb ? Number(form.quota_mb) : undefined,
          is_admin: form.is_admin,
        },
      });
      toast.success("Kullanıcı eklendi");
      setOpen(false);
      setForm({ email: "", password: "", display_name: "", quota_mb: "", is_admin: false });
      refresh();
    } catch (e: any) {
      toast.error("Eklenemedi", { description: e.message });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Kullanıcılar</CardTitle>
          <CardDescription>{users.length} kayıtlı kullanıcı</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="size-4 mr-2" /> Yeni Kullanıcı</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Kullanıcı Ekle</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>E-posta</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Geçici Şifre</Label><Input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Görünen Ad</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
              <div><Label>Kota (MB) — boş bırakılırsa varsayılan</Label><Input type="number" min={1} value={form.quota_mb} onChange={(e) => setForm({ ...form, quota_mb: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_admin} onCheckedChange={(v) => setForm({ ...form, is_admin: v })} /> <span>Yönetici yetkisi</span></div>
              <DialogFooter><Button type="submit">Oluştur</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">E-posta</th>
                <th className="p-3">Ad</th>
                <th className="p-3">Kullanım</th>
                <th className="p-3">Kota (MB)</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Rol</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => {
                const isAdmin = u.roles?.includes("admin");
                return (
                  <tr key={u.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{u.email}</td>
                    <td className="p-3">{u.display_name}</td>
                    <td className="p-3">{fmtBytes(u.storage_used_bytes)}</td>
                    <td className="p-3">
                      <QuotaCell
                        userId={u.id}
                        value={u.storage_quota_mb}
                        onSave={async (v) => {
                          try {
                            await setQuota({ data: { user_id: u.id, quota_mb: v } });
                            toast.success("Kota güncellendi");
                            refresh();
                          } catch (e: any) { toast.error(e.message); }
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={async (v) => {
                          try { await setActive({ data: { user_id: u.id, is_active: v } }); toast.success(v ? "Aktifleştirildi" : "Devre dışı"); refresh(); }
                          catch (e: any) { toast.error(e.message); }
                        }}
                      />
                    </td>
                    <td className="p-3">
                      {isAdmin ? <Badge>Admin</Badge> : <Badge variant="secondary">Kullanıcı</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title={isAdmin ? "Admin yetkisini kaldır" : "Admin yap"}
                          onClick={async () => {
                            try { await setAdmin({ data: { user_id: u.id, make_admin: !isAdmin } }); refresh(); }
                            catch (e: any) { toast.error(e.message); }
                          }}>
                          {isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" title="Şifre sıfırla"
                          onClick={async () => {
                            const np = prompt("Yeni geçici şifre (min 8 karakter):");
                            if (!np || np.length < 8) return;
                            try { await resetPw({ data: { user_id: u.id, new_password: np } }); toast.success("Şifre sıfırlandı"); }
                            catch (e: any) { toast.error(e.message); }
                          }}>
                          <KeyRound className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Sil"
                          onClick={async () => {
                            if (!confirm(`${u.email} ve tüm dosyaları silinsin mi?`)) return;
                            try { await del({ data: { user_id: u.id } }); toast.success("Silindi"); refresh(); }
                            catch (e: any) { toast.error(e.message); }
                          }}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaCell({ userId, value, onSave }: { userId: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex gap-1 items-center">
      <Input className="h-8 w-24" type="number" value={v} onChange={(e) => setV(e.target.value)} />
      {Number(v) !== value && (
        <Button size="sm" variant="ghost" onClick={() => onSave(Number(v))}><Save className="size-4" /></Button>
      )}
    </div>
  );
}

function FilesTab() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllFiles);
  const del = useServerFn(deleteFile);
  const { data: files = [] } = useQuery({ queryKey: ["admin-files"], queryFn: () => fetchAll() });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tüm Dosyalar</CardTitle>
        <CardDescription>{files.length} dosya (son 500)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="p-3">Dosya</th><th className="p-3">Sahip</th><th className="p-3">Boyut</th><th className="p-3">Tür</th><th className="p-3 text-right">İşlem</th></tr>
            </thead>
            <tbody>
              {files.map((f: any) => (
                <tr key={f.id} className="border-t">
                  <td className="p-3 max-w-xs truncate">{f.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{f.profiles?.email ?? "—"}</td>
                  <td className="p-3">{fmtBytes(f.size_bytes)}</td>
                  <td className="p-3 text-xs">{f.mime_type}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(`"${f.name}" silinsin mi?`)) return;
                      try { await del({ data: { file_id: f.id } }); toast.success("Silindi"); qc.invalidateQueries({ queryKey: ["admin-files"] }); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const fetchSettings = useServerFn(getSettings);
  const save = useServerFn(updateSettings);
  const { data, refetch } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const [defaultQuota, setDefaultQuota] = useState("");
  const [maxFile, setMaxFile] = useState("");
  const [mimes, setMimes] = useState("");

  // initialize when data arrives
  if (data && defaultQuota === "" && maxFile === "") {
    setDefaultQuota(String(data.default_quota_mb));
    setMaxFile(String(data.max_file_size_mb));
    setMimes((data.allowed_mime_prefixes ?? []).join(", "));
  }

  async function onSave() {
    try {
      await save({
        data: {
          default_quota_mb: Number(defaultQuota),
          max_file_size_mb: Number(maxFile),
          allowed_mime_prefixes: mimes.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      toast.success("Ayarlar kaydedildi");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sistem Ayarları</CardTitle>
        <CardDescription>Yeni kullanıcıların varsayılan kotası ve dosya kısıtlamaları</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2"><Label>Varsayılan Kota (MB)</Label><Input type="number" value={defaultQuota} onChange={(e) => setDefaultQuota(e.target.value)} /></div>
        <div className="space-y-2"><Label>Maksimum Dosya Boyutu (MB)</Label><Input type="number" value={maxFile} onChange={(e) => setMaxFile(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>İzin verilen MIME önekleri (virgülle ayrılmış, boş = tümü)</Label>
          <Input placeholder="image/, application/pdf" value={mimes} onChange={(e) => setMimes(e.target.value)} />
        </div>
        <Button onClick={onSave}><Save className="size-4 mr-2" /> Kaydet</Button>
      </CardContent>
    </Card>
  );
}