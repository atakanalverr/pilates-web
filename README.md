# Pilates Web

Güray ve Nuray için basit, excel-vari bir üye ve paket yönetim paneli.
Next.js (App Router) ile yazılmıştır.

## Çalıştırma

```bash
cd pilates-web
npm install
npm run dev
```

Sonra tarayıcıda **http://localhost:3000** adresine gidin.

İlk çalıştırmada `pilates.db` adında bir SQLite dosyası otomatik oluşturulur ve
örnek (hayali) paket/üye verileriyle doldurulur. Bu dosya tüm gerçek verinin
saklandığı yerdir — silmediğiniz sürece bilgisayarda kalıcıdır (git'e
eklenmez).

Canlı/production build için:

```bash
npm run build
npm start
```

## Ne var, ne yok

Tek sayfalık bir panel: hiçbir tanıtım sitesi, randevu formu ya da fiyat/içecek
listesi yok. Sadece iki basit tablo:

- **Paketler** — ad, seans sayısı, fiyat. Ekle/düzenle (satır içinde)/sil.
- **Üyeler** — ad, telefon, paket, kalan ders, antrenör, ödeme durumu, notlar.
  Ekle/düzenle/sil, "-1 Ders" ile kalan ders sayısını azalt.

## Dosya yapısı

- `app/page.js` — panel sayfası (App Router girişi)
- `app/layout.js` — kök layout, fontlar (Cormorant Garamond + Albert Sans)
- `app/globals.css` — Tailwind CSS + tasarım tokenleri
- `app/api/members/`, `app/api/packages/` — Route Handler'lar (GET/POST/PATCH/DELETE)
- `lib/db.js` — Node.js'in yerleşik `node:sqlite` modülüyle veritabanı katmanı
  (kurulum, seed verisi, sorgular). Ekstra native bağımlılık gerekmez.
- `lib/api.js` — tarayıcı tarafında `/api/...` uçlarına bağlanan istemci
- `components/AdminPanel.jsx` — panel state'i ve ana düzen
- `components/PackagesSection.jsx` — paketler bölümü
- `components/MembersSection.jsx` — istatistikler, üye formu, üye tablosu
- `components/EditMemberModal.jsx` — üye düzenleme modalı
- `components/Toast.jsx` — üst bildirim
- `pilates.db` — SQLite veritabanı (otomatik oluşur, git'e eklenmemeli)

## Teknoloji

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS 4**
- **node:sqlite** — Node.js'in yerleşik senkron SQLite modülü (native derleme
  gerektiren bir pakete ihtiyaç yok, bu yüzden Node 22.5+ gerekir)
