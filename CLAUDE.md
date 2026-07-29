@AGENTS.md

# Meyve Takip Sistemi Proje Kuralları

## Proje yapısı

Bu proje:

- React Native ve Expo frontend
- Spring Boot backend
- PostgreSQL veritabanı

kullanmaktadır.

Frontend klasörü:

- frontend/

Backend klasörü:

- src/main/java/com/emre/meyvetakipsistemi/

Android emulator backend adresi:

- http://10.0.2.2:8080/api

## Kullanıcı seviyesi

Projeyi geliştiren kullanıcı Java, Spring Boot ve React Native konusunda
başlangıç seviyesindedir.

Yaptığın her değişikliği sade Türkçe ile açıkla.

Her dosya için şu bilgileri ver:

1. Dosyanın görevi
2. Kim tarafından çağrıldığı
3. Hangi dosyayı çağırdığı
4. Kullanılan endpoint
5. Veritabanında ne değiştirdiği

## Çalışma kuralları

- Aynı anda yalnızca bir özellik üzerinde çalış.
- Mevcut çalışan özellikleri bozma.
- Önce projeyi incele ve plan hazırla.
- Kullanıcı onay vermeden dosya değiştirme.
- Kullanıcı onay vermeden paket kurma.
- Kullanıcı onay vermeden veritabanı kayıtlarını silme.
- Kullanıcı onay vermeden commit veya push yapma.
- Sahte veriyi gerçek backend verisi gibi gösterme.
- Bir özellik tamamlandı demeden önce test et.
- Değişiklik sonunda değiştirdiğin dosyaları listele.
- Çok uzun dosyalar oluşturma.
- Ekran, styles, yardımcı fonksiyonlar ve alt bileşenleri gerektiğinde
  ayrı dosyalara böl.
- Açıklama satırlarını faydalı yerlerde kullan fakat her satıra yorum ekleyerek
  dosyayı gereksiz uzatma.

## Backend kuralları

Spring Boot modüllerinde mümkün olduğunda şu katmanları kullan:

- Entity
- Repository
- Service
- Controller
- Request DTO
- Response DTO

Şifreler BCrypt ile saklanmalıdır.

API cevaplarında kullanıcı şifresi veya şifre hash'i gönderilmemelidir.

## Frontend kuralları

- React Native ve Expo uyumlu kod yaz.
- Mobil ekran tasarımını koru.
- Yeşil ağırlıklı mevcut tasarım dilini bozma.
- Backend API adresini ortak config dosyasından kullan.
- Meyve görsellerini backend imagePath alanından getir.
- KG ürünlerinde ondalıklı miktar olabilir.
- ADET, KASA, PAKET ve DEMET birimlerinde yalnızca tam sayı kabul edilir.

## Git kuralları

- Commit veya push işlemi yapma.
- Önce git status ve git diff ile değişiklikleri raporla.