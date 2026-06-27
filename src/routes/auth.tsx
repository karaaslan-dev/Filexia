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
      title: "1. Sisteme Giriş",
      body: "Hesabınız sistem yöneticisi tarafından oluşturulur ve tarafınıza kurumsal e-posta adresiniz ile geçici bir şifre iletilir. Giriş formunda kimlik bilgilerinizi girerek oturum açabilirsiniz. İlk girişte güvenlik politikası gereği şifrenizin değiştirilmesi zorunludur. Kimlik bilgilerinizi üçüncü kişilerle paylaşmayınız.",
    },
    {
      icon: KeyRound,
      title: "2. Şifre Yönetimi",
      body: "Oturum açtıktan sonra sağ üst köşede yer alan 'Ayarlar' bölümünden şifrenizi güncelleyebilirsiniz. Belirleyeceğiniz şifre en az 8 karakter uzunluğunda olmalı; büyük/küçük harf ve rakam içermesi önerilir. Şifrenizi düzenli aralıklarla yenilemeniz tavsiye edilir.",
    },
    {
      icon: FolderTree,
      title: "3. Klasör Yapısının Oluşturulması",
      body: "'Dosyalarım' bölümünde 'Yeni Klasör' seçeneği aracılığıyla iç içe klasör yapıları oluşturabilirsiniz. Klasör adına tıklayarak içeriğine erişebilir; sayfa üst kısmındaki yol göstergesi (breadcrumb) üzerinden üst dizinlere kolaylıkla dönebilirsiniz. Klasör organizasyonu, dosyalarınızın yönetimini kolaylaştırır.",
    },
    {
      icon: ShieldAlert,
      title: "4. Güvenlik Önkoşulu: VirusTotal Doğrulaması",
      body: "Sistem güvenliğinin korunması amacıyla yüklenecek her dosyanın önceden VirusTotal platformunda taranmış olması zorunludur. İşlem akışı: (1) virustotal.com adresine erişim sağlayın, (2) ilgili dosyayı yükleyerek taramanın tamamlanmasını bekleyin, (3) sonuç temiz ise Filexa üzerinden yükleme işlemini başlatın. Platform, dosyanın SHA-256 özetini hesaplayarak VirusTotal kayıtlarıyla otomatik doğrulama gerçekleştirir. Kayıt bulunamayan veya zararlı içerik tespit edilen dosyaların yüklenmesi sistem tarafından reddedilir.",
    },
    {
      icon: Upload,
      title: "5. Dosya Yükleme İşlemi",
      body: "'Yükle' düğmesi aracılığıyla yerel cihazınızdan dosya seçimi yapabilirsiniz. Yükleme sırasında ilerleme oranı ve VirusTotal doğrulama durumu eş zamanlı olarak görüntülenir. İşlem tamamlandığında dosya, ilgili klasörde listelenir. Tek bir dosya için azami boyut 5 GB olup, toplam depolama hacminiz hesabınıza tanımlı kota ile sınırlandırılmıştır.",
    },
    {
      icon: Eye,
      title: "6. Önizleme ve İndirme",
      body: "Dosya satırındaki önizleme (göz) simgesine tıklayarak görsel, video, ses, PDF ve metin biçimindeki dosyaları açılan pencere içerisinde, sayfadan ayrılmadan inceleyebilirsiniz. İndirme simgesi ise dosyayı doğrudan yerel cihazınıza aktarır.",
    },
    {
      icon: Share2,
      title: "7. Dosya Paylaşımı",
      body: "Paylaşım simgesi aracılığıyla dosyalarınız için güvenli erişim bağlantıları oluşturabilirsiniz. Bağlantıya şifre koruması ekleyebilir, son kullanma tarihi tanımlayabilir, indirme adedini sınırlandırabilir veya erişimi yalnızca kimliği doğrulanmış kullanıcılarla kısıtlayabilirsiniz. Oluşturulan tüm bağlantılar 'Paylaşımlarım' panelinden yönetilebilir ve gerektiğinde iptal edilebilir.",
    },
    {
      icon: Download,
      title: "8. Toplu İşlemler",
      body: "Listedeki onay kutuları yardımıyla birden fazla dosya veya klasörü aynı anda seçebilirsiniz. Üst araç çubuğu üzerinden seçili öğeleri ZIP biçiminde indirebilir veya topluca silebilirsiniz. Klasör silme işlemi, klasör içerisindeki tüm dosyaları geri alınamaz biçimde kaldırır; bu nedenle işlem öncesi seçimlerinizi gözden geçirmeniz önerilir.",
    },
    {
      icon: HelpCircle,
      title: "9. Destek ve Sorun Giderme",
      body: "Şifrenizi unutmanız veya hesabınızın askıya alınması durumunda lütfen sistem yöneticinizle iletişime geçiniz. 'VirusTotal kaydı bulunamadı' uyarısı alınması halinde, dosyanın virustotal.com platformunda tarandığından ve sonucun tamamlandığından emin olunuz.",
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" /> Filexa Kullanım Kılavuzu
          </DialogTitle>
          <DialogDescription>
            Platformun temel işlevlerine ilişkin adım adım kurumsal kullanım kılavuzu. Ek bilgi gereken durumlarda sistem yöneticinizle iletişime geçebilirsiniz.
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
            Not: Bu kılavuza giriş ekranındaki "Kullanım Kılavuzunu Görüntüle" düğmesi aracılığıyla istediğiniz zaman yeniden erişebilirsiniz.
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}