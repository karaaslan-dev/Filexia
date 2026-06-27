import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { changeMyPassword, getMyProfile } from "@/lib/files.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Ayarlar — Kasaport" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const change = useServerFn(changeMyPassword);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Şifre en az 8 karakter olmalı");
    if (pw !== pw2) return toast.error("Şifreler eşleşmiyor");
    setBusy(true);
    try {
      await change({ data: { new_password: pw } });
      toast.success("Şifre güncellendi");
      setPw(""); setPw2("");
    } catch (e: any) {
      toast.error("Güncellenemedi", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hesap</CardTitle>
          <CardDescription>{me?.profile?.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Görünen ad:</span> {me?.profile?.display_name}</div>
          <div><span className="text-muted-foreground">Kota:</span> {me?.profile?.storage_quota_mb} MB</div>
          <div><span className="text-muted-foreground">Rol:</span> {me?.isAdmin ? "Yönetici" : "Kullanıcı"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Şifre Değiştir</CardTitle>
          {me?.profile?.must_change_password && (
            <CardDescription className="text-amber-600">
              İlk girişinizdir — lütfen şifrenizi değiştirin.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni şifre</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label>Yeni şifre (tekrar)</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Şifreyi Güncelle"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}