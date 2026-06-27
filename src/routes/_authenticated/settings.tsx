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
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Ayarlar — Filexa" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const change = useServerFn(changeMyPassword);
  const t = useT();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error(t("settings.pwShort"));
    if (pw !== pw2) return toast.error(t("settings.pwMismatch"));
    setBusy(true);
    try {
      await change({ data: { new_password: pw } });
      toast.success(t("settings.pwUpdated"));
      setPw(""); setPw2("");
    } catch (e: any) {
      toast.error(t("settings.pwFailed"), { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account")}</CardTitle>
          <CardDescription>{me?.profile?.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><span className="text-muted-foreground">{t("settings.displayName")}</span> {me?.profile?.display_name}</div>
          <div><span className="text-muted-foreground">{t("settings.quota")}</span> {me?.profile?.storage_quota_mb} MB</div>
          <div><span className="text-muted-foreground">{t("settings.role")}</span> {me?.isAdmin ? t("settings.roleAdmin") : t("settings.roleUser")}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.changePw")}</CardTitle>
          {me?.profile?.must_change_password && (
            <CardDescription className="text-amber-600">
              {t("settings.mustChange")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("settings.newPw")}</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.newPw2")}</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? t("settings.saving") : t("settings.update")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}