# Pilates Web

Güray ve Nuray için pilates stüdyosu web sitesi + üye/randevu yönetim paneli.

## Çalıştırma

Hesap açmaya, kütüphane kurmaya gerek yok — sadece Python 3 yeterli:

```bash
cd pilates-web
python3 server.py
```

Sonra tarayıcıda **http://localhost:8000** adresine gidin.

İlk çalıştırmada `pilates.db` adında bir SQLite dosyası otomatik oluşturulur ve
örnek (hayali) üye/randevu verileriyle doldurulur. Bu dosya tüm gerçek verinin
saklandığı yerdir — silmediğiniz sürece bilgisayarda kalıcıdır.

## Sayfalar

- `index.html` — herkese açık tanıtım sitesi (hizmetler, fiyatlar, "Yeni Kayıt Oluştur" formu)
- `admin.html` — antrenör paneli: üye listesi, ekleme/düzenleme/silme, ders işleme, katılım geçmişi
  - Header'daki **Üyeler** menüsünden Güray/Nuray seçilerek sadece o antrenörün üyeleri filtrelenebilir
    (`admin.html?trainer=Güray` gibi)

## Dosya yapısı

- `server.py` — statik dosyaları servis eden ve `/api/...` uçlarını sağlayan Python sunucusu (stdlib only)
- `pilates.db` — SQLite veritabanı (otomatik oluşur, git'e eklenmemeli)
- `db.js` — tarayıcı tarafında `/api/...` uçlarına bağlanan küçük istemci
- `admin.js` / `booking.js` — panel ve randevu formu mantığı
- `style.css` / `admin.css` — tasarım
