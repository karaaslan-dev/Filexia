import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ShieldCheck, BookOpen, LogIn, Upload, ShieldAlert, FolderTree, Share2, Eye, Download, KeyRound, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Giriş — Filexa" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
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
      toast.error("Giriş başarısız", { description: error.message });
      return;
    }
    toast.success("Hoş geldiniz");
    navigate({ to: "/drive" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck className="size-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Filexa</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Hesabınıza giriş yapın</CardTitle>
            <CardDescription>
              Bu kapalı bir sistemdir. Hesabınız yoksa lütfen yöneticinizle iletişime geçin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Lock className="size-4 mr-2" />
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" className="w-full" onClick={() => setGuideOpen(true)}>
                <BookOpen className="size-4 mr-2" />
                Kullanım Kılavuzunu Görüntüle
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Geliştirici: <span className="font-medium text-foreground">Enes KARAASLAN</span>
        </p>
      </div>
      <UserGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}

function UserGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const steps = [
    {
      icon: LogIn,
      title: "1) Sisteme nasıl girilir?",
      body: "Yöneticiniz size bir e-posta ve geçici şifre verir. Yukarıdaki formu doldurup 'Giriş Yap' butonuna tıklayın. İlk girişte sistem sizden yeni bir şifre belirlemenizi isteyecek. Şifrenizi kimseyle paylaşmayın.",
    },
    {
      icon: KeyRound,
      title: "2) Şifremi nasıl değiştiririm?",
      body: "Giriş yaptıktan sonra sağ üstteki 'Ayarlar' butonuna tıklayın. Açılan sayfada yeni şifrenizi yazıp kaydedin. Şifreniz en az 8 karakter olmalı.",
    },
    {
      icon: FolderTree,
      title: "3) Klasör nasıl oluştururum?",
      body: "'Dosyalarım' sayfasında 'Yeni Klasör' butonuna basın, bir isim girin ve onaylayın. Bir klasörün içine girmek için üstüne tıklayın. Üst tarafta yolun (Anasayfa › Klasör1 › ...) görüleceğini unutmayın; oradan da geri dönebilirsiniz.",
    },
    {
      icon: ShieldAlert,
      title: "4) Dosya yüklemeden önce VirusTotal şart",
      body: "Güvenlik için her dosya yüklenmeden önce VirusTotal'da taranmış olmalı. Adımlar: 1) virustotal.com adresine gidin. 2) Dosyanızı oraya yükleyip tarama bitsin. 3) Tarama temiz çıkarsa Kasaport'a dönüp 'Yükle' butonuna basın. Sistem dosyanızın parmak izini (SHA-256) hesaplayıp VirusTotal'da otomatik kontrol eder. Eğer dosya VirusTotal'da bulunamazsa veya zararlı çıkarsa yükleme reddedilir.",
    },
    {
      icon: Upload,
      title: "5) Dosya yükleme",
      body: "'Yükle' butonuna tıklayın, bilgisayarınızdan dosyayı seçin. Üst kısımda yüzde göstergesi ilerlerken alt satırda 'VirusTotal kontrol ediliyor...' yazısı göreceksiniz. Tamamlanınca dosya listede görünür. Tek seferde 5 GB'a kadar yükleyebilirsiniz; toplam alanınız hesabınıza tanımlı kotayla sınırlıdır.",
    },
    {
      icon: Eye,
      title: "6) Önizleme ve indirme",
      body: "Bir dosyanın yanındaki göz ikonuna basarak resim, video, ses, PDF veya metin dosyalarını sayfadan ayrılmadan görüntüleyebilirsiniz. İndirmek için ok ikonuna basın; tarayıcınız indirmeyi başlatır. PDF açılmazsa 'Yeni sekmede aç' bağlantısını kullanın.",
    },
    {
      icon: Share2,
      title: "7) Dosya paylaşımı",
      body: "Paylaş ikonuna basıp bir bağlantı oluşturabilirsiniz. İsteğe bağlı seçenekler: şifre koyma, son kullanma tarihi belirleme, en fazla kaç kez indirilebileceğini sınırlama, yalnızca giriş yapmış kullanıcıların erişebilmesi. Oluşturulan bağlantıyı dilediğiniz kişiye gönderebilirsiniz. 'Paylaşımlarım' panelinden bağlantıları iptal edebilirsiniz.",
    },
    {
      icon: Download,
      title: "8) Toplu işlemler",
      body: "Dosyaların yanındaki kutucukları işaretleyerek birden fazla dosya seçebilirsiniz. Üst menüden hepsini tek ZIP halinde indirebilir veya toptan silebilirsiniz. Klasörler de aynı anda seçilebilir; silindiklerinde içlerindeki tüm dosyalar da silinir, dikkat edin.",
    },
    {
      icon: HelpCircle,
      title: "9) Bir sorun mu var?",
      body: "Şifrenizi unuttuysanız veya hesabınız kilitlendiyse yöneticinize başvurun. Yükleme 'VirusTotal'da bulunamadı' hatası verirse, dosyayı önce virustotal.com adresine yükleyip taramayı bitirmeyi unutmayın.",
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" /> Kasaport Kullanım Rehberi
          </DialogTitle>
          <DialogDescription>
            Adım adım, hiçbir teknik bilgi gerektirmeden. Anlamadığınız bir yer olursa yöneticinize sorun.
          </DialogDescription>
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
            İpucu: Bu rehbere giriş ekranındaki "Kullanım rehberini aç" butonuyla her zaman tekrar ulaşabilirsiniz.
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}