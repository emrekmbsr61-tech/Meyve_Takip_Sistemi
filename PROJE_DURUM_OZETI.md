# Meyve Takip Sistemi — Proje Durum Özeti

> Bu dosya, bir sohbet oturumundan diğerine teknik bağlamın kaybolmaması için
> tutulur. Yeni bir konuşmada Claude'a bu dosyayı okumasını söylersen
> (`PROJE_DURUM_OZETI.md`), projenin durumuyla devam edebilir.
>
> **Son güncelleme: 21 Ağustos 2026**

---

## 1. Proje Nedir

**Mini Meyve Alım-Toplama Kontrol Sistemi** — bir sipariş takip uygulaması
değil, bir **denetim** uygulaması. Amaç: meyve mağazaya ulaşana kadar geçtiği
her aşamada miktarın değişip değişmediğini yakalamak, yani kaybın **hangi
aşamada** olduğunu tespit etmek.

**Kontrol mantığı:** Dört kişi, dört bağımsız sayım. Her biri bir öncekinin
rakamını **görmeden** kendi saydığını girer:

1. **Mağaza personeli** → ne kadar lazım (İhtiyaç)
2. **Mağaza müdürü** → halden ne kadar aldı (Alım) — fiyat da burada
3. **Şoför** → kendi saydığı miktar (Toplama) — *müdürün miktarını ve fiyatını göremez*
4. **Mağaza personeli** → teslim alırken kendi saydığı (Kabul)

Sistem bu dördünü karşılaştırır; iki aşama arasında düşüş varsa kayıp oradadır
ve otomatik olarak `audit_logs`'a yazılır.

**Kullanıcı:** Projeyi geliştiren Emre; Java/Spring Boot/React Native'de
başlangıç seviyesinde. Staj bitimine **5 iş günü** var (26 Ağustos civarı).

---

## 2. Mimari

```
frontend/                                    React Native (Expo SDK 57, RN 0.86)
  src/pages/…/index.js         → ekranlar
  src/components/              → paylaşılan bileşenler
  src/services/…Service.js     → backend'e istek atan fonksiyonlar
  src/services/httpClient.js   → TÜM istekler buradan, token otomatik eklenir
  src/services/websocketService.js → anlık bildirim (STOMP)
  src/config/api.js            → backend adresi (OTOMATİK çözülür, sabit IP yok)

src/main/java/com/emre/meyvetakipsistemi/    Spring Boot 3, Java 21
  <modül>/…Controller.java     → HTTP kapısı (ince katman) + @PreAuthorize
  <modül>/…Service.java        → İŞ KURALLARI
  <modül>/…Repository.java     → veritabanı sorguları
  <modül>/<Entity>.java        → tablo karşılığı
  <modül>/dto/…                → Request / Response (entity ASLA doğrudan dönmez)

PostgreSQL 18                                veritabanı: meyve_takip_sistemi
```

**Ortak desen:** `Ekran → Servis (frontend) → httpClient → Controller → Service → Repository → DB`

---

## 3. Veritabanı (14 tablo)

Ana zincir, hepsi `plan_id` ile bağlı:

```
delivery_plans → need_list → purchases → collections → acceptances + acceptance_items
```

Destekleyiciler: `users`, `fruits`, `suppliers`, `task_assignments`, `audit_logs`,
`price_history`, `email_verification_codes`, `transport_logs` (kullanılmıyor, legacy).

**planId'nin doğuşu:** `NeedListService.createNeedListPlan()` içinde
`deliveryPlanRepository.save()` çağrıldığı an PostgreSQL auto-increment ile üretir.
Frontend planId'yi asla göndermez.

---

## 4. Şu Anki Durum

| Kontrol | Durum |
|---|---|
| Backend derlemesi (`mvnw compile`) | ✅ Temiz |
| Frontend söz dizimi | ✅ Temiz |
| Şartname zorunlu maddeleri | ✅ Hepsi karşılanıyor (bkz. bölüm 7) |
| Git | 22 commit + **54 dosya commit bekliyor** (21 Ağustos akşamı atılacak) |
| **Gerçek telefonda uçtan uca elle test** | ❌ **EN ÖNEMLİ AÇIK** |
| Otomatik test (JUnit) | ❌ Yok (şartnamede istenmiyor) |

---

## 5. 21 Ağustos'ta Yapılanlar (bu oturum)

### 5.1 Bağlantı ve oturum (3 hata)

1. **Sabit IP** — `api.js`'te backend adresi elle yazılıydı, Wi-Fi IP'si
   değişince bağlantı kopuyordu. Üç denemede çözüldü:
   `NativeModules.SourceCode` (RN 0.86'da kaldırılmış, `undefined` dönüyordu) →
   `getDevServer()` (çalıştı ama deep-import uyarısı) → **`expo-constants`**
   (son hâli). Açılışta `[API] Backend adresi:` konsola yazılıyor.
2. **Süresi dolmuş token** — `tokenStorage.loadSession()` süreyi kontrol etmiyordu.
   Backend logu kanıtı: `CONNECT(9)-CONNECTED(0)`. Artık süre dolmuşsa oturum
   temizlenip Giriş ekranına yönlendiriliyor.
3. **SafeAreaProvider yoktu** — `App.js`'e eklendi. Bu ayrıca bildirim kutusunun
   sessiz hatasını da düzeltti.

### 5.2 Giriş/Kayıt tasarımı

Mentör "iş uygulamasına benzemiyor" dedi. `AuthLayout.js` + `AuthField.js`
(yeni ortak bileşenler) ile Home'daki koyu yeşil kart diline uyduruldu.
Ham `<Button>` kaldırıldı (Android'de mavi çıkıyordu).

### 5.3 Doğrulama (mentörün gösterdiği konu)

- `user/validation/` paketi **yeni**: `UniqueEmail`, `UniqueEmailValidator`,
  `UniqueUsername`, `UniqueUsernameValidator`, `EmailNormalizer`
- Elle yazılmış e-posta regex'i (`.com` zorunlu tutuyordu) → `@Email`
- **Bulunan gerçek hata:** `AuthController.register()`'da `@Valid` yoktu, yani
  anotasyonlar eklense bile hiç çalışmayacaktı
- **"@ yazmadan kayıt":** `EmailNormalizer`, `emre` → `emre@gmail.com`.
  Tamamlama DTO'nun `setEmail`'inde yapılır (doğrulamadan ÖNCE); aynı kural
  `VerifyEmailRequest` ve `ResendVerificationRequest`'e de uygulandı
- **Mentörden bilinçli sapma:** validator exception fırlatmıyor, `false`
  döndürüyor — böylece Spring tüm hataları tek seferde toplayıp bildiriyor

### 5.4 Görev atama (yeni özellik)

Müdür personele plandan bağımsız görev atayabiliyor (ör. "Depo temizliği").

- `TaskType.GENEL` eklendi; `TaskAssignment`'a `title`, `assignedBy`, `completedAt`
- Yeni DTO'lar: `CreateTaskRequest`, `AssignableUserResponse`, `CompletedTaskResponse`
- Uçlar: `POST /api/tasks`, `PATCH /api/tasks/{id}/complete`,
  `GET /api/tasks/completed`, `GET /api/tasks/assignable-users`
- `AssignTaskModal.js` (yeni) — kişi listeden seçilir, süre hazır seçeneklerden
- Tamamlanınca müdüre anlık bildirim gider

**Mentörün "bir alanı null olabilir" notu = `planId`.** Serbest görevin planı
yok; üç yerde ayrı ayrı ele alındı yoksa ekranda **"Plan #null"** yazacaktı.

**Veritabanı hatası (bu projede 3. kez):** `task_assignments_task_type_check`
kısıtı `GENEL`'i reddetti. `ddl-auto=update` yeni SÜTUN ekler ama var olan
CHECK kısıtını GÜNCELLEMEZ. `migration_audit_log_action_types.sql`'e üçüncü
bölüm eklenip çalıştırıldı; 64 kayıt korundu.

### 5.5 "Devam Eden İşlemler" ekranı (yeni)

*"Alımı yaptım, mal şimdi nerede?"* sorusunun cevabı. `PlanProgressService.java`
akış sırasına (ALIM→TOPLAMA→TESLIMAT→ACCEPTANCE) bakıp **tamamlanmamış ilk
görevi** buluyor. Aşamaya göre filtreleniyor. Yalnızca müdür + admin.

### 5.6 Rol bazlı yetkilendirme

**27 endpoint** `@PreAuthorize` ile korunuyor (önce 6'ydı). Rol imzalı JWT'den
okunuyor. Servislerdeki sahiplik kontrolleri **korundu** — anotasyon "hangi
ROL", servis "hangi KİŞİ" sorusunu yanıtlıyor.

### 5.7 Ekran düzeni

- Tamamlanan İşlemler: personelden alındı → müdür + admin (**hem menüden hem
  backend yetkisinden** — menü sadece görünümü gizler)
- Mevcut İhtiyaçlar müdürden kaldırıldı (Alım İşlemleri'yle örtüşüyordu)
- Ekstra ürün ekleme → Alım İşlemleri'ne taşındı, `NeedListList`'ten ölü kod silindi
- Özet ekranı: kayıplar plan bazında gruplu, tıklayınca açılıyor
- İşlem Kayıtları **iki kez** yazıldı → son hâli: kayıt türü seç → içine gir,
  kayıtlar **plan bazında** toplu, tekrarlar `×5` diye birleşiyor

### 5.8 Ölü kod temizliği

`NeedLists/index.js` ekranı (menüye bağlı değildi) silindi; `createUser`,
`getAllUsers`, `getUserById`, `createNeedList`, `deleteNeedList`,
`getNeedListById` uçları kaldırıldı; boş `error/` ve `shared/` klasörleri silindi.

---

## 6. Rollere Göre Ekranlar (güncel)

| Ekran | Personel | Müdür | Şoför | Admin |
|---|:---:|:---:|:---:|:---:|
| İhtiyaç Oluştur | ✅ | — | — | — |
| Mevcut İhtiyaçlar | ✅ | — | — | ✅ |
| Mal Kabul Sayımı | ✅ | — | — | — |
| Alım İşlemleri | — | ✅ | — | ✅ |
| Aktif Görevler | ✅ | ✅ | ✅ | ✅ |
| Devam Eden İşlemler | — | ✅ | — | ✅ |
| Tamamlanan İşlemler | — | ✅ | — | ✅ |
| Özet | — | ✅ | — | ✅ |
| Meyve Listesi | ✅ | ✅ | ✅ | ✅ |
| Kullanıcı Onayları | — | — | — | ✅ |
| İşlem Kayıtları | — | — | — | ✅ |

Menü sırası `Home/index.js` → `ROLE_MENU_KEYS`. "Devam Eden İşlemler" bilerek
"Tamamlanan İşlemler"in hemen üstünde.

---

## 7. Şartname Karşılaştırması

**Karşılanan zorunlu maddeler:** 3+ rol ve iş akışı · Register/Login/E-posta
doğrulama · JWT + BCrypt · rol bazlı @PreAuthorize · 8 veri modeli · süreli
görev atama + otomatik zincir · canlı geri sayım · gecikme cron'u · WebSocket
anlık bildirim · AuditLog (ZORUNLU) + filtreleme · 4 aşamalı tutarlılık
kontrolü · otomatik plan özet maili · Dashboard · fiyat geçmişi · katmanlı
mimari + DTO + @Valid + GlobalExceptionHandler + @Transactional · Swagger · README

**Eksikler:**
1. **State yönetimi (Redux/Zustand) yok** — şartname "kurgulanmalıdır" diyor.
   Savunulabilir: tek paylaşılan state `currentUser`, canlı akış zaten merkezi
   `websocketService` ile çözülmüş. Eklenmesi gerekirse React Context yeterli.
2. **TypeScript kullanılmıyor** — şartnamede "şiddetle tavsiye edilir", zorunlu değil.
3. **E-posta doğrulama UUID link yerine 6 haneli kod** (10 dk geçerli) — sapma,
   mobilde daha uygun, savunulabilir.

---

## 8. Bilinen Açık Konular

1. **DB şifresi düz metin** — `application.properties` içinde
   `spring.datasource.password` açık. Mail ve JWT için ortam değişkeni
   kullanılmış, bu unutulmuş. **5 dakikalık iş, yapılması öneriliyor.**
2. **Gerçek cihazda uçtan uca test yapılmadı** — en önemli açık nokta.
3. **Görev dağıtımı** — TOPLAMA görevi artık açık görev sayısı en az olan
   şoföre atanıyor (`PurchaseService.pickLeastBusyDriver`); ikinci bir şoför
   eklenirse otomatik paylaşılır. ALIM görevi hâlâ `findFirstByRoleOrderByIdAsc`
   ile tek müdüre gidiyor — sistemde bilinçli olarak tek müdür ve tek admin
   olacağı için bu bilinçli bir sınırlamadır.
4. Test kullanıcıları temizlendi (13 kullanıcı → 5). Kalan `testkullanici29`
   (id 3) silinmedi: üzerinde 2 görev kaydı var, silinirse yetim kayıt oluşurdu.
   Doğrulanmamış olduğu için görev atama listesinde görünmüyor.

---

## 9. Sıradaki Adımlar (5 iş günü)

| Gün | İş |
|---|---|
| 1 | **Uçtan uca elle test** (aşağıdaki senaryo) |
| 1 | DB şifresini ortam değişkenine taşı |
| 2 | Demo provası — sesli, mentöre anlatır gibi |
| 3 | Zor sorulara hazırlık |
| 4-5 | Buffer |

**Test/demo senaryosu:** Personel ihtiyaç oluştursun → Müdür alım yapsın (arada
ekstra ürün ekleyerek) → Müdür "Devam Eden İşlemler"den takip etsin → Şoför
toplasın (**bilerek eksik**, 100 yerine 95) → Teslim etsin → Personel mal kabul
yapsın (yine eksik) → Müdür "Tamamlanan İşlemler"de sonucu görsün → Admin
"İşlem Kayıtları → Kritik ve Hatalar"da kaybın yakalandığını görsün → Mail
geldi mi kontrol et. Arada müdür görev atasın, personel tamamlasın.

**Hazır olunması gereken sorular:**
1. *Şoför fiyatı neden göremiyor?* → `CollectionPlanItemResponse` sınıfında o
   alanlar **hiç tanımlı değil**; gizleme kontrolü değil, olmayan şey sızamaz
2. *planId nereden geliyor?* → Veritabanı üretir, `deliveryPlanRepository.save()` anında
3. *Rol yetkilendirmesi nasıl?* → `@PreAuthorize` + JWT'den okunan rol + servis
   seviyesinde sahiplik kontrolü (iki katman)
4. *Kaybı nasıl tespit ediyorsun?* → 4 bağımsız sayım, `ConsistencyCheckService`,
   sonuç otomatik `audit_logs`'a

---

## 10. Geçmişten Ders Çıkarılan Notlar

- **Enum'a değer eklemek Java'da yetmez:** `ddl-auto=update` var olan CHECK
  kısıtlarını güncellemez. Bu hata 3 kez yaşandı (`audit_logs.action_type`,
  `task_assignments.status`, `task_assignments.task_type`). Çözüm dosyası:
  `src/main/resources/db/migration_audit_log_action_types.sql`
- **Küçük id'li test kullanıcısı oluşturma:** sistem görevleri en küçük id'li
  müdür/şoföre atadığı için gerçek kullanıcının görevlerini üstüne çeker.
  Geçmişte bir kez yaşandı, onarıldı.
- **Log yazma ayrı transaction'da** (`AuditLogService.createLogSafely`,
  `REQUIRES_NEW`) — bir log hatası asıl işlemi geri aldıramaz.
