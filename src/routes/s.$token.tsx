import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getShareLinkInfo, redeemShareLink } from "@/lib/share.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Lock, LogIn, ShieldCheck, FileIcon } from "lucide-react";

export const Route = createFileRoute("/s/$token")({
  head: () => ({ meta: [{ title: "Paylaşılan dosya — Filexa" }] }),
  component: SharePage,
});

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function SharePage() {
  const { token } = Route.useParams();
  const info = useServerFn(getShareLinkInfo);
  const redeem = useServerFn(redeemShareLink);

  const { data, error, isLoading } = useQuery({
    queryKey: ["share-info", token],
    queryFn: () => info({ data: { token } }),
    retry: false,
  });

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onDownload() {
    setBusy(true);
    try {
      const res = await redeem({ data: { token, password: password || undefined } });
      window.location.href = res.url;
    } catch (e: any) {
      toast.error("İndirme reddedildi", { description: e.message });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 grid place-items-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Filexa Paylaşımı</CardTitle>
            <CardDescription>Aşağıdaki dosyayı güvenli şekilde indirebilirsiniz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor…</p>
            ) : error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                {(error as Error).message}
              </div>
            ) : data ? (
              <>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <FileIcon className="size-6 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{data.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtBytes(data.size_bytes)}
                      {data.expires_at && <> · Son tarih: {new Date(data.expires_at).toLocaleString("tr-TR")}</>}
                      {data.remaining != null && <> · Kalan indirme: {data.remaining}</>}
                    </div>
                  </div>
                </div>
                {data.require_auth && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm flex items-start gap-2">
                    <LogIn className="size-4 mt-0.5 shrink-0" />
                    <div>
                      Bu bağlantı yalnızca giriş yapmış kullanıcılar içindir.{" "}
                      <Link to="/auth" className="underline">Giriş yap</Link>
                    </div>
                  </div>
                )}
                {data.has_password && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="size-4" /> Parola</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                )}
                <Button className="w-full" disabled={busy} onClick={onDownload}>
                  <Download className="size-4 mr-2" /> {busy ? "Hazırlanıyor…" : "İndir"}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground border-t">
        Geliştirici: <span className="font-medium text-foreground">Enes KARAASLAN</span>
      </footer>
    </div>
  );
}