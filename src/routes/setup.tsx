import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setupStatus, createFirstAdmin } from "@/lib/setup.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useT, LanguageToggle } from "@/lib/i18n";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({ meta: [{ title: "İlk Kurulum — Filexa" }] }),
  component: SetupPage,
});

function SetupPage() {
  const status = useServerFn(setupStatus);
  const create = useServerFn(createFirstAdmin);
  const nav = useNavigate();
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["setup-status"], queryFn: () => status() });
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (data && !data.needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>{t("setup.doneTitle")}</CardTitle>
            <CardDescription>{t("setup.doneDesc")}</CardDescription>
          </CardHeader>
          <CardContent><Button onClick={() => nav({ to: "/auth" })}>{t("setup.toLogin")}</Button></CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { email: email.trim(), password: pw, display_name: name || undefined } });
      toast.success(t("setup.created"));
      nav({ to: "/auth" });
    } catch (e: any) {
      toast.error(t("setup.failed"), { description: e.message });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><ShieldCheck className="size-6 text-primary" /><CardTitle>{t("setup.title")}</CardTitle></div>
            <LanguageToggle />
          </div>
          <CardDescription>{t("setup.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t("setup.pwHint")}</Label><Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t("setup.displayName")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? t("setup.creating") : t("setup.create")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}