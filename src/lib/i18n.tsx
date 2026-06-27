import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export type Lang = "tr" | "en";

type Dict = Record<string, { tr: string; en: string }>;

export const dict: Dict = {
  // common
  "common.loading": { tr: "Yükleniyor…", en: "Loading…" },
  "common.save": { tr: "Kaydet", en: "Save" },
  "common.cancel": { tr: "İptal", en: "Cancel" },
  "common.close": { tr: "Kapat", en: "Close" },
  "common.delete": { tr: "Sil", en: "Delete" },
  "common.rename": { tr: "Yeniden adlandır", en: "Rename" },
  "common.copy": { tr: "Kopyala", en: "Copy" },
  "common.copied": { tr: "Kopyalandı", en: "Copied" },
  "common.refresh": { tr: "Yenile", en: "Refresh" },
  "common.deleted": { tr: "Silindi", en: "Deleted" },
  "common.saved": { tr: "Ayarlar kaydedildi", en: "Settings saved" },
  "common.hours": { tr: "saat", en: "hours" },
  "common.downloads": { tr: "indirme", en: "downloads" },

  // language
  "lang.toggle": { tr: "EN", en: "TR" },
  "lang.label": { tr: "Dil", en: "Language" },

  // brand / footer
  "brand.name": { tr: "Filexa", en: "Filexa" },
  "brand.tagline": { tr: "Filexa — Güvenli Dosya Sürücüsü", en: "Filexa — Secure File Drive" },
  "brand.description": { tr: "Kapalı sistem, kotalı, gelişmiş bir dosya yükleme ve paylaşım sürücüsü.", en: "A closed-system, quota-based, advanced file upload and sharing drive." },
  "footer.developer": { tr: "Geliştirici:", en: "Developer:" },

  // not found / error
  "nf.title": { tr: "Sayfa bulunamadı", en: "Page not found" },
  "nf.body": { tr: "Aradığınız sayfa mevcut değil veya taşınmış olabilir.", en: "The page you're looking for doesn't exist or has been moved." },
  "nf.home": { tr: "Ana sayfa", en: "Go home" },
  "err.title": { tr: "Bu sayfa yüklenemedi", en: "This page didn't load" },
  "err.body": { tr: "Bir şeyler ters gitti. Sayfayı yenilemeyi deneyebilir veya ana sayfaya dönebilirsiniz.", en: "Something went wrong on our end. You can try refreshing or head back home." },
  "err.retry": { tr: "Tekrar dene", en: "Try again" },

  // nav
  "nav.files": { tr: "Dosyalarım", en: "My Files" },
  "nav.admin": { tr: "Yönetim", en: "Admin" },
  "nav.settings": { tr: "Ayarlar", en: "Settings" },
  "nav.signOut": { tr: "Çıkış", en: "Sign out" },

  // auth
  "auth.metaTitle": { tr: "Giriş — Filexa", en: "Sign in — Filexa" },
  "auth.title": { tr: "Hesabınıza giriş yapın", en: "Sign in to your account" },
  "auth.desc": { tr: "Bu sistem kullanıcıların projelerini yükleyebilmeleri için geliştirilmiştir.", en: "This system is designed so that users can upload their projects." },
  "auth.email": { tr: "E-posta", en: "Email" },
  "auth.password": { tr: "Şifre", en: "Password" },
  "auth.signin": { tr: "Giriş Yap", en: "Sign in" },
  "auth.signingin": { tr: "Giriş yapılıyor...", en: "Signing in..." },
  "auth.failed": { tr: "Giriş başarısız", en: "Sign-in failed" },
  "auth.welcome": { tr: "Hoş geldiniz", en: "Welcome" },
  "auth.openGuide": { tr: "Kullanım Kılavuzunu Görüntüle", en: "Open User Guide" },

  // guide
  "guide.title": { tr: "Filexa Kullanım Kılavuzu", en: "Filexa User Guide" },
  "guide.desc": { tr: "Platformun temel işlevlerine ilişkin adım adım kurumsal kullanım kılavuzu. Ek bilgi gereken durumlarda sistem yöneticinizle iletişime geçebilirsiniz.", en: "A step-by-step corporate user guide covering the platform's main features. For additional information, please contact your system administrator." },
  "guide.note": { tr: "Not: Bu kılavuza giriş ekranındaki \"Kullanım Kılavuzunu Görüntüle\" düğmesi aracılığıyla istediğiniz zaman yeniden erişebilirsiniz.", en: "Note: You can revisit this guide at any time via the \"Open User Guide\" button on the sign-in screen." },
  "guide.s1.t": { tr: "1. Sisteme Giriş", en: "1. Signing In" },
  "guide.s1.b": { tr: "Hesabınız sistem yöneticisi tarafından oluşturulur ve tarafınıza kurumsal e-posta adresiniz ile geçici bir şifre iletilir. Giriş formunda kimlik bilgilerinizi girerek oturum açabilirsiniz. İlk girişte güvenlik politikası gereği şifrenizin değiştirilmesi zorunludur. Kimlik bilgilerinizi üçüncü kişilerle paylaşmayınız.", en: "Your account is created by the system administrator and a temporary password is delivered together with your corporate email. Enter your credentials in the sign-in form to start a session. As required by the security policy, you must change your password on first sign-in. Never share your credentials with third parties." },
  "guide.s2.t": { tr: "2. Şifre Yönetimi", en: "2. Password Management" },
  "guide.s2.b": { tr: "Oturum açtıktan sonra sağ üst köşede yer alan 'Ayarlar' bölümünden şifrenizi güncelleyebilirsiniz. Belirleyeceğiniz şifre en az 8 karakter uzunluğunda olmalı; büyük/küçük harf ve rakam içermesi önerilir. Şifrenizi düzenli aralıklarla yenilemeniz tavsiye edilir.", en: "Once signed in, you can change your password from the 'Settings' section in the top right corner. Your password must be at least 8 characters long and should contain a mix of upper/lower-case letters and digits. Regular password rotation is recommended." },
  "guide.s3.t": { tr: "3. Klasör Yapısının Oluşturulması", en: "3. Building the Folder Structure" },
  "guide.s3.b": { tr: "'Dosyalarım' bölümünde 'Yeni Klasör' seçeneği aracılığıyla iç içe klasör yapıları oluşturabilirsiniz. Klasör adına tıklayarak içeriğine erişebilir; sayfa üst kısmındaki yol göstergesi (breadcrumb) üzerinden üst dizinlere kolaylıkla dönebilirsiniz. Klasör organizasyonu, dosyalarınızın yönetimini kolaylaştırır.", en: "In the 'My Files' section you can create nested folder hierarchies via the 'New Folder' option. Click a folder name to open it and use the breadcrumb at the top to navigate back to parent directories. A clear folder organization makes file management easier." },
  "guide.s4.t": { tr: "4. Güvenlik Önkoşulu: VirusTotal Doğrulaması", en: "4. Security Prerequisite: VirusTotal Verification" },
  "guide.s4.b": { tr: "Sistem güvenliğinin korunması amacıyla yüklenecek her dosyanın önceden VirusTotal platformunda taranmış olması zorunludur. İşlem akışı: (1) virustotal.com adresine erişim sağlayın, (2) ilgili dosyayı yükleyerek taramanın tamamlanmasını bekleyin, (3) sonuç temiz ise Filexa üzerinden yükleme işlemini başlatın. Platform, dosyanın SHA-256 özetini hesaplayarak VirusTotal kayıtlarıyla otomatik doğrulama gerçekleştirir. Kayıt bulunamayan veya zararlı içerik tespit edilen dosyaların yüklenmesi sistem tarafından reddedilir.", en: "To preserve system security, every file you upload must first be scanned on VirusTotal. Workflow: (1) go to virustotal.com, (2) upload the file and wait for the scan to complete, (3) if the result is clean, start the upload on Filexa. The platform computes the file's SHA-256 hash and verifies it against VirusTotal records automatically. Files with no record or detected malicious content will be rejected." },
  "guide.s5.t": { tr: "5. Dosya Yükleme İşlemi", en: "5. Uploading Files" },
  "guide.s5.b": { tr: "'Yükle' düğmesi aracılığıyla yerel cihazınızdan dosya seçimi yapabilirsiniz. Yükleme sırasında ilerleme oranı ve VirusTotal doğrulama durumu eş zamanlı olarak görüntülenir. İşlem tamamlandığında dosya, ilgili klasörde listelenir. Tek bir dosya için azami boyut 5 GB olup, toplam depolama hacminiz hesabınıza tanımlı kota ile sınırlandırılmıştır.", en: "Use the 'Upload' button to pick a file from your device. Progress and VirusTotal verification status are shown in real time. Once finished, the file appears in the current folder. The maximum size per file is 5 GB and your total storage is limited by the quota assigned to your account." },
  "guide.s6.t": { tr: "6. Önizleme ve İndirme", en: "6. Preview and Download" },
  "guide.s6.b": { tr: "Dosya satırındaki önizleme (göz) simgesine tıklayarak görsel, video, ses, PDF ve metin biçimindeki dosyaları açılan pencere içerisinde, sayfadan ayrılmadan inceleyebilirsiniz. İndirme simgesi ise dosyayı doğrudan yerel cihazınıza aktarır.", en: "Click the preview (eye) icon on a file row to view images, videos, audio, PDFs and text files inside an in-page window without leaving Filexa. The download icon transfers the file directly to your local device." },
  "guide.s7.t": { tr: "7. Dosya Paylaşımı", en: "7. File Sharing" },
  "guide.s7.b": { tr: "Paylaşım simgesi aracılığıyla dosyalarınız için güvenli erişim bağlantıları oluşturabilirsiniz. Bağlantıya şifre koruması ekleyebilir, son kullanma tarihi tanımlayabilir, indirme adedini sınırlandırabilir veya erişimi yalnızca kimliği doğrulanmış kullanıcılarla kısıtlayabilirsiniz. Oluşturulan tüm bağlantılar 'Paylaşımlarım' panelinden yönetilebilir ve gerektiğinde iptal edilebilir.", en: "Use the share icon to generate secure access links for your files. You can protect a link with a password, set an expiry date, limit the number of downloads, or restrict access to authenticated users only. All generated links can be managed and revoked from the 'My Shares' panel." },
  "guide.s8.t": { tr: "8. Toplu İşlemler", en: "8. Bulk Operations" },
  "guide.s8.b": { tr: "Listedeki onay kutuları yardımıyla birden fazla dosya veya klasörü aynı anda seçebilirsiniz. Üst araç çubuğu üzerinden seçili öğeleri ZIP biçiminde indirebilir veya topluca silebilirsiniz. Klasör silme işlemi, klasör içerisindeki tüm dosyaları geri alınamaz biçimde kaldırır; bu nedenle işlem öncesi seçimlerinizi gözden geçirmeniz önerilir.", en: "Use the checkboxes in the list to select multiple files or folders at once. From the top action bar you can download the selection as a ZIP archive or delete it in bulk. Deleting a folder removes all of its contents irreversibly, so review your selection before confirming." },
  "guide.s9.t": { tr: "9. Destek ve Sorun Giderme", en: "9. Support and Troubleshooting" },
  "guide.s9.b": { tr: "Şifrenizi unutmanız veya hesabınızın askıya alınması durumunda lütfen sistem yöneticinizle iletişime geçiniz. 'VirusTotal kaydı bulunamadı' uyarısı alınması halinde, dosyanın virustotal.com platformunda tarandığından ve sonucun tamamlandığından emin olunuz.", en: "If you forget your password or your account becomes suspended, please contact your system administrator. If you see the 'No VirusTotal record found' warning, make sure the file has been scanned on virustotal.com and that the scan has completed." },

  // setup
  "setup.metaTitle": { tr: "İlk Kurulum — Filexa", en: "Initial Setup — Filexa" },
  "setup.doneTitle": { tr: "Kurulum tamamlanmış", en: "Setup completed" },
  "setup.doneDesc": { tr: "Bir yönetici hesabı zaten mevcut.", en: "An administrator account already exists." },
  "setup.toLogin": { tr: "Giriş Sayfası", en: "Sign-in Page" },
  "setup.title": { tr: "İlk Kurulum", en: "Initial Setup" },
  "setup.desc": { tr: "İlk yönetici hesabını oluşturun. Bu sayfa yalnızca sistem boşken çalışır.", en: "Create the first administrator account. This page only works while the system is empty." },
  "setup.pwHint": { tr: "Şifre (min 8)", en: "Password (min 8)" },
  "setup.displayName": { tr: "Görünen Ad", en: "Display name" },
  "setup.create": { tr: "Yöneticiyi Oluştur", en: "Create Administrator" },
  "setup.creating": { tr: "Oluşturuluyor...", en: "Creating..." },
  "setup.created": { tr: "Yönetici hesabı oluşturuldu", en: "Administrator account created" },
  "setup.failed": { tr: "Oluşturulamadı", en: "Could not be created" },

  // settings page
  "settings.metaTitle": { tr: "Ayarlar — Filexa", en: "Settings — Filexa" },
  "settings.account": { tr: "Hesap", en: "Account" },
  "settings.displayName": { tr: "Görünen ad:", en: "Display name:" },
  "settings.quota": { tr: "Kota:", en: "Quota:" },
  "settings.role": { tr: "Rol:", en: "Role:" },
  "settings.roleAdmin": { tr: "Yönetici", en: "Administrator" },
  "settings.roleUser": { tr: "Kullanıcı", en: "User" },
  "settings.changePw": { tr: "Şifre Değiştir", en: "Change Password" },
  "settings.mustChange": { tr: "İlk girişinizdir — lütfen şifrenizi değiştirin.", en: "This is your first sign-in — please change your password." },
  "settings.newPw": { tr: "Yeni şifre", en: "New password" },
  "settings.newPw2": { tr: "Yeni şifre (tekrar)", en: "New password (confirm)" },
  "settings.update": { tr: "Şifreyi Güncelle", en: "Update Password" },
  "settings.saving": { tr: "Kaydediliyor...", en: "Saving..." },
  "settings.pwShort": { tr: "Şifre en az 8 karakter olmalı", en: "Password must be at least 8 characters" },
  "settings.pwMismatch": { tr: "Şifreler eşleşmiyor", en: "Passwords do not match" },
  "settings.pwUpdated": { tr: "Şifre güncellendi", en: "Password updated" },
  "settings.pwFailed": { tr: "Güncellenemedi", en: "Update failed" },

  // drive
  "drive.metaTitle": { tr: "Dosyalarım — Filexa", en: "My Files — Filexa" },
  "drive.title": { tr: "Dosyalarım", en: "My Files" },
  "drive.summary": { tr: "{0} dosya · {1} klasör · Maks tek dosya {2} MB", en: "{0} files · {1} folders · Max per file {2} MB" },
  "drive.search": { tr: "Bu klasörde ara…", en: "Search in this folder…" },
  "drive.folder": { tr: "Klasör", en: "Folder" },
  "drive.upload": { tr: "Yükle", en: "Upload" },
  "drive.shares": { tr: "Paylaşımlar", en: "Shares" },
  "drive.sharesTitle": { tr: "Paylaşımlarım", en: "My Shares" },
  "drive.uploading": { tr: "Yükleniyor: {0}", en: "Uploading: {0}" },
  "drive.storage": { tr: "Depolama", en: "Storage" },
  "drive.storageUsed": { tr: "%{0} kullanıldı", en: "{0}% used" },
  "drive.root": { tr: "Kök", en: "Root" },
  "drive.selected": { tr: "{0} seçili", en: "{0} selected" },
  "drive.zipDownload": { tr: "ZIP indir", en: "Download ZIP" },
  "drive.zipPreparing": { tr: "ZIP hazırlanıyor…", en: "Preparing ZIP…" },
  "drive.emptyFolder": { tr: "Bu klasör boş. Yükleyin veya yeni klasör oluşturun.", en: "This folder is empty. Upload a file or create a new folder." },
  "drive.noMatch": { tr: "Eşleşen öğe bulunamadı.", en: "No matching items found." },
  "drive.selectAll": { tr: "Tümünü seç", en: "Select all" },
  "drive.preview": { tr: "Önizle", en: "Preview" },
  "drive.share": { tr: "Paylaş", en: "Share" },
  "drive.confirmDeleteFile": { tr: "\"{0}\" silinsin mi?", en: "Delete \"{0}\"?" },
  "drive.confirmDeleteFolder": { tr: "\"{0}\" ve içindekiler silinsin mi?", en: "Delete \"{0}\" and its contents?" },
  "drive.confirmBulk": { tr: "{0} öğe silinsin mi? (klasörler içerikleriyle birlikte)", en: "Delete {0} items? (folders include their contents)" },
  "drive.bulkDeleted": { tr: "{0} öğe silindi", en: "{0} items deleted" },
  "drive.folderDeleted": { tr: "Klasör silindi", en: "Folder deleted" },
  "drive.fileDeleted": { tr: "Dosya silindi", en: "File deleted" },
  "drive.deleteFailed": { tr: "Silinemedi", en: "Could not delete" },
  "drive.newFolderPrompt": { tr: "Yeni klasör adı:", en: "New folder name:" },
  "drive.newFolderFailed": { tr: "Klasör oluşturulamadı", en: "Could not create folder" },
  "drive.renamePrompt": { tr: "Yeni ad:", en: "New name:" },
  "drive.renameFailed": { tr: "Yeniden adlandırılamadı", en: "Could not rename" },
  "drive.tooLarge": { tr: "Dosya çok büyük (maks {0} MB)", en: "File too large (max {0} MB)" },
  "drive.quotaExceed": { tr: "Kota aşılacak", en: "Quota would be exceeded" },
  "drive.sha": { tr: "SHA-256 hesaplanıyor…", en: "Computing SHA-256…" },
  "drive.vtCheck": { tr: "VirusTotal kontrol ediliyor…", en: "Checking VirusTotal…" },
  "drive.vtRequired": { tr: "VirusTotal raporu gerekli", en: "VirusTotal report required" },
  "drive.vtRequiredDesc": { tr: "Bu dosyanın VT raporu yok. virustotal.com adresine yükleyip taradıktan sonra tekrar deneyin.", en: "No VT report for this file. Please upload it to virustotal.com to scan, then try again." },
  "drive.vtOpen": { tr: "VT'yi aç", en: "Open VT" },
  "drive.vtRisk": { tr: "Güvenlik riski tespit edildi", en: "Security risk detected" },
  "drive.vtRiskDesc": { tr: "{0} kötü amaçlı / {1} şüpheli. Yükleme engellendi.", en: "{0} malicious / {1} suspicious. Upload blocked." },
  "drive.vtClean": { tr: "VT temiz ({0} motor)", en: "VT clean ({0} engines)" },
  "drive.vtFailed": { tr: "VirusTotal doğrulaması başarısız", en: "VirusTotal verification failed" },
  "drive.uploadFailed": { tr: "Yükleme başarısız", en: "Upload failed" },
  "drive.uploaded": { tr: "Yüklendi", en: "Uploaded" },
  "drive.registerFailed": { tr: "Kayıt edilemedi", en: "Could not register" },
  "drive.dlUrlFailed": { tr: "İndirme bağlantısı alınamadı", en: "Could not get download link" },
  "drive.notPreviewable": { tr: "Bu dosya türü önizlenemez", en: "This file type cannot be previewed" },
  "drive.previewFailed": { tr: "Önizleme alınamadı", en: "Could not load preview" },
  "drive.zipPickFiles": { tr: "ZIP için dosya seç", en: "Pick files for ZIP" },
  "drive.zipDone": { tr: "{0} dosya ZIP olarak indirildi", en: "{0} files downloaded as ZIP" },
  "drive.zipFailed": { tr: "ZIP oluşturulamadı", en: "Could not create ZIP" },

  // share dialog
  "sd.title": { tr: "Paylaşım bağlantısı oluştur", en: "Create share link" },
  "sd.link": { tr: "Bağlantı", en: "Link" },
  "sd.created": { tr: "Paylaşım bağlantısı oluşturuldu", en: "Share link created" },
  "sd.createFailed": { tr: "Oluşturulamadı", en: "Could not create" },
  "sd.pwProt": { tr: "Parola koruması", en: "Password protection" },
  "sd.pwProtDesc": { tr: "İndirmek için parola gerekir.", en: "A password is required to download." },
  "sd.pwInput": { tr: "Parola (min 4 karakter)", en: "Password (min 4 chars)" },
  "sd.expiry": { tr: "Son kullanma", en: "Expiry" },
  "sd.expiryDesc": { tr: "Belirtilen saat sonra geçersiz olur.", en: "Becomes invalid after the specified hours." },
  "sd.limit": { tr: "İndirme limiti", en: "Download limit" },
  "sd.limitDesc": { tr: "N kez indirildikten sonra kapanır.", en: "Closes after N downloads." },
  "sd.authOnly": { tr: "Yalnız giriş yapanlar", en: "Signed-in users only" },
  "sd.authOnlyDesc": { tr: "Sisteme kayıtlı kullanıcılar erişebilir.", en: "Only registered users can access." },
  "sd.createBtn": { tr: "Bağlantı Oluştur", en: "Create link" },
  "sd.creating": { tr: "Oluşturuluyor…", en: "Creating…" },

  // my links
  "ml.title": { tr: "Paylaşımlarım", en: "My Shares" },
  "ml.count": { tr: "{0} bağlantı", en: "{0} links" },
  "ml.empty": { tr: "Henüz paylaşım yok.", en: "No shares yet." },
  "ml.file": { tr: "Dosya", en: "File" },
  "ml.revoked": { tr: "İptal", en: "Revoked" },
  "ml.expired": { tr: "Süresi doldu", en: "Expired" },
  "ml.exhausted": { tr: "Limit doldu", en: "Limit reached" },
  "ml.pw": { tr: "🔒 Parolalı", en: "🔒 Password" },
  "ml.members": { tr: "👤 Üyeler", en: "👤 Members" },
  "ml.revokeConfirm": { tr: "Bağlantı silinsin mi?", en: "Delete link?" },
  "ml.cancelled": { tr: "İptal edildi", en: "Revoked" },

  // share page (public)
  "sp.metaTitle": { tr: "Paylaşılan dosya — Filexa", en: "Shared file — Filexa" },
  "sp.title": { tr: "Filexa Paylaşımı", en: "Filexa Share" },
  "sp.desc": { tr: "Aşağıdaki dosyayı güvenli şekilde indirebilirsiniz.", en: "You can safely download the file below." },
  "sp.expires": { tr: "Son tarih: {0}", en: "Expires: {0}" },
  "sp.remaining": { tr: "Kalan indirme: {0}", en: "Remaining downloads: {0}" },
  "sp.requireAuth": { tr: "Bu bağlantı yalnızca giriş yapmış kullanıcılar içindir.", en: "This link is for signed-in users only." },
  "sp.signIn": { tr: "Giriş yap", en: "Sign in" },
  "sp.password": { tr: "Parola", en: "Password" },
  "sp.download": { tr: "İndir", en: "Download" },
  "sp.preparing": { tr: "Hazırlanıyor…", en: "Preparing…" },
  "sp.denied": { tr: "İndirme reddedildi", en: "Download denied" },

  // admin
  "ad.metaTitle": { tr: "Yönetim — Filexa", en: "Admin — Filexa" },
  "ad.tabUsers": { tr: "Kullanıcılar", en: "Users" },
  "ad.tabFiles": { tr: "Tüm Dosyalar", en: "All Files" },
  "ad.tabSettings": { tr: "Sistem Ayarları", en: "System Settings" },
  "ad.tabAudit": { tr: "Denetim Kayıtları", en: "Audit Logs" },
  "ad.usersTitle": { tr: "Kullanıcılar", en: "Users" },
  "ad.usersCount": { tr: "{0} kayıtlı kullanıcı", en: "{0} registered users" },
  "ad.bulkExcel": { tr: "Excel ile Toplu Ekle", en: "Bulk Add via Excel" },
  "ad.newUser": { tr: "Yeni Kullanıcı", en: "New User" },
  "ad.addUser": { tr: "Kullanıcı Ekle", en: "Add User" },
  "ad.tempPw": { tr: "Geçici Şifre", en: "Temporary Password" },
  "ad.quotaDefault": { tr: "Kota (MB) — boş bırakılırsa varsayılan", en: "Quota (MB) — leave blank for default" },
  "ad.adminRole": { tr: "Yönetici yetkisi", en: "Administrator role" },
  "ad.create": { tr: "Oluştur", en: "Create" },
  "ad.userAdded": { tr: "Kullanıcı eklendi", en: "User added" },
  "ad.userAddFailed": { tr: "Eklenemedi", en: "Could not add" },
  "ad.bulkTitle": { tr: "Excel ile Toplu Kullanıcı Ekle", en: "Bulk Add Users via Excel" },
  "ad.bulkCols": { tr: "Excel/CSV sütunları:", en: "Excel/CSV columns:" },
  "ad.bulkPwHint": { tr: "Şifreler en az 8 karakter olmalı.", en: "Passwords must be at least 8 characters." },
  "ad.bulkTemplate": { tr: "Şablon indir (.xlsx)", en: "Download template (.xlsx)" },
  "ad.bulkPick": { tr: "Dosya seç", en: "Choose file" },
  "ad.bulkLoading": { tr: "Yükleniyor…", en: "Loading…" },
  "ad.bulkNoRows": { tr: "Geçerli satır bulunamadı", en: "No valid rows found" },
  "ad.bulkOk": { tr: "{0}/{1} kullanıcı eklendi", en: "{0}/{1} users added" },
  "ad.bulkFailed": { tr: "Toplu ekleme başarısız", en: "Bulk add failed" },
  "ad.colEmail": { tr: "E-posta", en: "Email" },
  "ad.colName": { tr: "Ad", en: "Name" },
  "ad.colUsage": { tr: "Kullanım", en: "Usage" },
  "ad.colQuota": { tr: "Kota (MB)", en: "Quota (MB)" },
  "ad.colStatus": { tr: "Durum", en: "Status" },
  "ad.colRole": { tr: "Rol", en: "Role" },
  "ad.colActions": { tr: "İşlemler", en: "Actions" },
  "ad.quotaUpdated": { tr: "Kota güncellendi", en: "Quota updated" },
  "ad.activated": { tr: "Aktifleştirildi", en: "Activated" },
  "ad.deactivated": { tr: "Devre dışı", en: "Disabled" },
  "ad.makeAdmin": { tr: "Admin yap", en: "Make admin" },
  "ad.removeAdmin": { tr: "Admin yetkisini kaldır", en: "Remove admin role" },
  "ad.resetPw": { tr: "Şifre sıfırla", en: "Reset password" },
  "ad.resetPwPrompt": { tr: "Yeni geçici şifre (min 8 karakter):", en: "New temporary password (min 8 chars):" },
  "ad.pwReset": { tr: "Şifre sıfırlandı", en: "Password reset" },
  "ad.deleteUserConfirm": { tr: "{0} ve tüm dosyaları silinsin mi?", en: "Delete {0} and all of their files?" },
  "ad.allFiles": { tr: "Tüm Dosyalar", en: "All Files" },
  "ad.allFilesCount": { tr: "{0} dosya (son 500)", en: "{0} files (last 500)" },
  "ad.colFile": { tr: "Dosya", en: "File" },
  "ad.colOwner": { tr: "Sahip", en: "Owner" },
  "ad.colSize": { tr: "Boyut", en: "Size" },
  "ad.colType": { tr: "Tür", en: "Type" },
  "ad.colAction": { tr: "İşlem", en: "Action" },
  "ad.deleteFileConfirm": { tr: "\"{0}\" silinsin mi?", en: "Delete \"{0}\"?" },
  "ad.sysTitle": { tr: "Sistem Ayarları", en: "System Settings" },
  "ad.sysDesc": { tr: "Yeni kullanıcıların varsayılan kotası ve dosya kısıtlamaları", en: "Default quota for new users and file restrictions" },
  "ad.defaultQuota": { tr: "Varsayılan Kota (MB)", en: "Default Quota (MB)" },
  "ad.maxFile": { tr: "Maksimum Dosya Boyutu (MB)", en: "Max File Size (MB)" },
  "ad.mimePrefixes": { tr: "İzin verilen MIME önekleri (virgülle ayrılmış, boş = tümü)", en: "Allowed MIME prefixes (comma-separated, empty = all)" },
  "ad.auditTitle": { tr: "Denetim Kayıtları", en: "Audit Logs" },
  "ad.auditCount": { tr: "Son {0} işlem", en: "Last {0} actions" },
  "ad.colTime": { tr: "Zaman", en: "Time" },
  "ad.colUser": { tr: "Kullanıcı", en: "User" },
  "ad.colAction2": { tr: "İşlem", en: "Action" },
  "ad.colResource": { tr: "Kaynak", en: "Resource" },
  "ad.colDetail": { tr: "Detay", en: "Detail" },
  "ad.auditEmpty": { tr: "Henüz kayıt yok.", en: "No records yet." },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "tr",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");
  useEffect(() => {
    try {
      const stored = (typeof window !== "undefined" && localStorage.getItem("filexa.lang")) as Lang | null;
      if (stored === "tr" || stored === "en") setLangState(stored);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("filexa.lang", l); } catch {}
    try { document.documentElement.lang = l; } catch {}
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

function format(s: string, args: Array<string | number>) {
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

export function useT() {
  const { lang } = useLang();
  return (key: string, ...args: Array<string | number>): string => {
    const entry = dict[key];
    if (!entry) return key;
    const value = entry[lang] ?? entry.tr;
    return args.length ? format(value, args) : value;
  };
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next: Lang = lang === "tr" ? "en" : "tr";
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      aria-label="Toggle language"
      onClick={() => setLang(next)}
      title={lang === "tr" ? "Switch to English" : "Türkçeye geç"}
    >
      <Languages className="size-4 mr-1" />
      <span className="font-semibold">{lang.toUpperCase()}</span>
    </Button>
  );
}