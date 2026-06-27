import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ShieldCheck, BookOpen, LogIn, Upload, ShieldAlert, FolderTree, Share2, Eye, Download, KeyRound, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT, LanguageToggle } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Giriş — Filexa" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/drive" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(t("auth.failed"), { description: error.message });
      return;
    }
    toast.success(t("auth.welcome"));
    navigate({ to: "/drive" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2"><LanguageToggle /></div>
        <div className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck className="size-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("brand.name")}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.title")}</CardTitle>
            <CardDescription>{t("auth.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Lock className="size-4 mr-2" />
                {loading ? t("auth.signingin") : t("auth.signin")}
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" className="w-full" onClick={() => setGuideOpen(true)}>
                <BookOpen className="size-4 mr-2" />
                {t("auth.openGuide")}
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("footer.developer")} <span className="font-medium text-foreground">Enes KARAASLAN</span>
        </p>
      </div>
      <UserGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}

function UserGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const steps = [
    { icon: LogIn, title: t("guide.s1.t"), body: t("guide.s1.b") },
    { icon: KeyRound, title: t("guide.s2.t"), body: t("guide.s2.b") },
    { icon: FolderTree, title: t("guide.s3.t"), body: t("guide.s3.b") },
    { icon: ShieldAlert, title: t("guide.s4.t"), body: t("guide.s4.b") },
    { icon: Upload, title: t("guide.s5.t"), body: t("guide.s5.b") },
    { icon: Eye, title: t("guide.s6.t"), body: t("guide.s6.b") },
    { icon: Share2, title: t("guide.s7.t"), body: t("guide.s7.b") },
    { icon: Download, title: t("guide.s8.t"), body: t("guide.s8.b") },
    { icon: HelpCircle, title: t("guide.s9.t"), body: t("guide.s9.b") },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" /> {t("guide.title")}
          </DialogTitle>
          <DialogDescription>{t("guide.desc")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <ol className="space-y-5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="shrink-0 size-9 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
            {t("guide.note")}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}