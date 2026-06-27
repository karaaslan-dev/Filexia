import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, FolderOpen, Settings, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/files.functions";
import { useT, LanguageToggle } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const t = useT();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/drive" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            {t("brand.name")}
          </Link>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/drive"><FolderOpen className="size-4 mr-2" /> {t("nav.files")}</Link>
            </Button>
            {data?.isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin"><Users className="size-4 mr-2" /> {t("nav.admin")}</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings"><Settings className="size-4 mr-2" /> {t("nav.settings")}</Link>
            </Button>
            <LanguageToggle />
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="size-4 mr-2" /> {t("nav.signOut")}
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        {t("footer.developer")} <span className="font-medium text-foreground">Enes KARAASLAN</span>
      </footer>
    </div>
  );
}