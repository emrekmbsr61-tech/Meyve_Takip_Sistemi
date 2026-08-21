# Meyve Takip Sistemi — Proje Durum Özeti

> Bu dosya, bir sohbet oturumundan diğerine teknik bağlamın kaybolmaması için
> oluşturuldu. Yeni bir konuşmada Claude'a bu dosyayı okumasını söylersen
> (`PROJE_DURUM_OZETI.md`), projenin tam geçmişiyle devam edebilir.

---

## 1. Proje Nedir

**Mini Meyve Alım-Toplama Kontrol Sistemi** — bir sipariş takip uygulaması
değil, bir **denetim** uygulaması. Amacı: meyve mağazaya ulaşana kadar geçtiği
her aşamada miktarın değişip değişmediğini yakalamak, yani kaybın/hırsızlığın
**hangi aşamada** olduğunu tespit etmek.

**Kontrol mantığı:** Her personel kendi işlemini bağımsız olarak yapar ve
gerçek miktarları sisteme girer; bir önceki aşamanın miktarını görmeden:

1. **Mağaza personeli** → ne kadar lazım olduğunu yazar (İhtiyaç)
2. **Mağaza müdürü** → halden ne kadar aldığını yazar (Alım) — fiyat da burada girilir
3. **Şoför** → kendi saydığı miktarı yazar (Toplama) — **müdürün miktarını ve fiyatını göremez**
4. **Mağaza personeli** → teslim alırken kendi saydığı miktarı yazar (Kabul)

Sistem bu dört bağımsız sayımı karşılaştırır; iki aşama arasında miktar
düştüyse orada bir kayıp vardır ve bu otomatik olarak işlem kayıtlarına yazılır.

**Kullanıcı seviyesi:** Projeyi geliştiren, Java/Spring Boot/React Native
konusunda başlangıç seviyesinde. Şu an 8-9 günlük bir kod okuma sürecinde,
sunuma hazırlanıyor.

---

## 2. Mimari

```
frontend/                                    React Native (Expo, SDK 57)
  src/pages/…/index.js         → ekranlar
  src/services/…Service.js     → backend'e istek atan fonksiyonlar
  src/services/httpClient.js   → TÜM istekler buradan geçer, token otomatik eklenir
  src/services/websocketService.js → anlık bildirim bağlantısı (STOMP)
  src/components/              → paylaşılan küçük bileşenler (CountdownText vb.)

src/main/java/com/emre/meyvetakipsistemi/    Spring Boot 3, Java 21
  <modül>/…Controller.java     → HTTP adresini karşılar (ince katman)
  <modül>/…Service.java        → İŞ KURALLARI burada
  <modül>/…Repository.java     → veritabanı sorguları (Spring Data JPA)
  <modül>/<Entity>.java        → veritabanı tablosunun Java karşılığı
  <modül>/dto/…Request.java    → frontend'den gelen veri
  <modül>/dto/…Response.java   → frontend'e giden veri (entity ASLA doğrudan dönmez)

PostgreSQL                                   veritabanı: meyve_takip_sistemi
```

**Her özelliğin izlediği ortak desen** (bunu anlarsan projenin tamamını anlarsın):

```
Ekran → Servis (frontend) → httpClient.js (token ekler) → İNTERNET
      → Controller → Service (iş kuralları) → Repository → PostgreSQL
```

**Güvenlik:** JWT tabanlı. `JwtAuthenticationFilter` her isteği karşılar, token
geçerliyse kullanıcı id'sini ve rolünü Spring Security context'ine yerleştirir.
`SecurityConfig`'te `/api/auth/**`, `/swagger-ui/**`, `/ws/**`, `/fruits/**`
(görsel dosyaları) dışında **her endpoint token ister**. Admin-özel
endpoint'ler `@PreAuthorize("hasRole('ADMIN')")` ile korunur.
`@EnableMethodSecurity` bunu SecurityConfig'te açar.

**Anlık bildirim:** WebSocket (STOMP), `/topic/notifications/{userId}`
adresine yayın yapılır. Her kullanıcı yalnızca kendi adresine abone olabilir
(`StompAuthChannelInterceptor` bunu doğrular — aşağıda "kritik hatalar"da detay var).

---

## 3. Veritabanı Yapısı (PostgreSQL — 14 tablo)

**Ana zincir** — hepsi `plan_id` ile birbirine bağlı:

```
delivery_plans  →  need_list  →  purchases  →  collections  →  acceptances + acceptance_items
   (planId          (İhtiyaç)     (Alım)         (Toplama)        (Mal Kabul, satır bazlı)
    burada
    doğar)
```

**Destekleyici tablolar:**

| Tablo | Görevi |
|---|---|
| `users` | Kullanıcılar (id, username, password [BCrypt], role, isVerified) |
| `fruits` | Meyve/sebze kataloğu (isPerishable, profitMarginPercent burada) |
| `suppliers` | Tedarikçiler |
| `task_assignments` | Görev atamaları (planId, assignedUserId, taskType, status, dueDate) |
| `audit_logs` | Tüm işlem kayıtları (userId, actionType, **planId**, **status**, **details** JSON) |
| `price_history` | Alım fiyatı geçmişi (son 3 gün karşılaştırması için) |
| `email_verification_codes` | E-posta doğrulama kodları |
| `transport_logs` | Kullanılmıyor, eski/legacy kalıntı |

`planId`'nin doğuşu: `NeedListService.createNeedListPlan()` içinde önce
`DeliveryPlan` kaydedilir (`deliveryPlanRepository.save()` → veritabanı yeni id
üretir), sonra seçilen **her meyve** aynı döngüde bu id ile `need_list`
tablosuna yazılır. planId frontend'den asla gönderilmez, backend üretir.

---

## 4. Bugüne Kadar Yapılan İşler (kronolojik)

### 4.1 — Şartname denetimi ve 10 eksik maddenin tamamlanması

Kullanıcının verdiği `PROJECT ASSIGNMENT.docx` dosyası kod ile satır satır
karşılaştırıldı, eksik liste çıkarıldı ve **hepsi tamamlandı**:

1. **AuditLog zenginleştirildi** — `planId`, `status` (yeni enum `AuditStatus`:
   SUCCESS/WARNING/ERROR/CRITICAL), `details` (JSON metni) alanları eklendi.
2. **ConsistencyCheckService** (`consistency/` modülü) — projenin kalbi.
   Toplama ve Mal Kabul kaydedilir kaydedilmez otomatik çalışır, 4
   karşılaştırma yapar: İhtiyaç↔Alım (WARNING), Alım↔Toplama (CRITICAL),
   Toplama↔Kabul (CRITICAL), İhtiyaç↔Kabul (ERROR). `CheckStage` enum'u ile
   hangi aşamada hangi karşılaştırmaların yapılacağı ayrılır (aşağıda "hata 4"e bakın).
3. **Güvenlik sıkılaştırması** — `CurrentUserService` kimliği JWT'den okur
   (istekten değil). `updateNeedList`/`deleteNeedList`/`TaskAssignmentService.start`
   artık sahiplik kontrolü yapıyor (`requireOwnerOrAdmin`). Admin endpoint'lerine
   `@PreAuthorize` eklendi.
4. **OverdueTaskScheduler** — `@Scheduled` ile 5 dakikada bir kendiliğinden
   çalışır, süresi geçen görevleri `OVERDUE` yapar, WARNING logu yazar,
   sorumlusuna bildirim gönderir.
5. **GlobalExceptionHandler** — merkezi hata yönetimi, tüm hatalar aynı JSON
   biçiminde döner (`timestamp, status, error, message, path`). Bu arada
   `httpClient.js`'te bir hata bulundu: hata mesajını yalnızca düz metinken
   okuyordu, JSON nesnesinden okumuyordu — düzeltildi.
6. **Dashboard/Özet ekranı** — `GET /api/dashboard`. (Sonradan büyük ölçüde
   yeniden tasarlandı, bkz. 4.5)
7. **DTO dönüşümleri** — entity'lerin doğrudan API'de dönmesi engellendi (bu
   iş bugün genişletilerek tamamlandı, bkz. 4.6).
8. **Canlı geri sayım + görev süresi** — `CountdownText.js` saniyede bir
   güncellenir, süre azaldıkça renk değişir. `TaskDeadlineCalculator` dört
   ayrı yerde tekrarlanan "4 saat" sabitini tek yere topladı ve
   `isPerishable` kuralını gerçekten uygulamaya başladı (bozulabilir üründe 2 saat).
9. **README yeniden yazıldı**, kurulum/DB/rol tabloları eklendi. "Plan Notu"
   hatası düzeltildi (`NeedListResponse`'ta `planNotes` alanı eksikti).
10. **Plan özet maili** — `PlanSummaryMailService`. Mal kabul tamamlanınca
    renkli HTML mail: ürün tablosu, farklar, TL cinsinden finansal kayıp
    özeti. `meyve.mail.plan-summary.enabled` ayarıyla geliştirirken kapatılabilir.

### 4.2 — Uçtan uca test sırasında bulunan 4 GERÇEK HATA

Ayrı bir test backend'i (port 8090) ve geçici test kullanıcılarıyla tüm akış
gerçek veritabanında test edildi. Şunlar bulundu ve düzeltildi:

1. **Süre hesaplama hatası** — `assignAlimTask()` ürünler veritabanına
   yazılmadan **önce** çağrılıyordu; bu yüzden `TaskDeadlineCalculator` planı
   hep boş görüyor, bozulabilir üründe bile 4 saat veriyordu. Çağrı sırası
   düzeltildi (ürünler kaydedildikten sonra çağrılıyor).
2. **Veritabanı kısıtı hatası (en ciddisi)** — `audit_logs.action_type`
   sütununda eski bir CHECK kısıtı vardı, yalnızca ilk 13 enum değerini kabul
   ediyordu. Yeni `CONSISTENCY_CHECK`/`SYSTEM_CHECK` değerleri eklenince
   veritabanı INSERT'i reddediyordu — ve bu, **aynı transaction içindeki asıl
   işlemi de (şoförün toplama kaydı gibi) geri alıyordu**. Üç parçalı çözüm:
   - Veritabanı kısıtı güncellendi
   - Kalıcı migration dosyası: `src/main/resources/db/migration_audit_log_action_types.sql`
   - **Mimari düzeltme:** Log yazma artık `AuditLogService.createLogSafely()`
     ile **ayrı bir transaction'da** (`@Transactional(propagation = REQUIRES_NEW)`,
     try/catch içinde) yapılıyor. Bir log hatası artık asla asıl işlemi bozamaz.
3. **Aynı kısıt sorunu `task_assignments.status`'ta da vardı** — `OVERDUE`
   değeri kabul edilmiyordu. Aynı migration dosyasıyla düzeltildi.
   `OverdueTaskScheduler` da dayanıklı hale getirildi: artık her görevi ayrı
   ayrı işliyor (`markSingleTaskOverdue`), biri hata verirse diğerleri
   etkilenmiyor.
4. **Tekrarlayan bulgu hatası** — `ConsistencyCheckService` hem Toplama hem
   Kabul sonrasında TÜM 4 karşılaştırmayı yapıyordu, bu da aynı ürün için
   tekrarlayan log kayıtlarına yol açıyordu. `CheckStage` enum'u
   (`AFTER_COLLECTION` / `AFTER_ACCEPTANCE`) eklenerek her aşama yalnızca
   kendi yeni karşılaştırmalarını yapacak şekilde ayrıldı.

### 4.3 — Kullanıcı deneyimi iyileştirmeleri

- **NeedListCreate**: miktar artık +/- yanında elle de yazılabiliyor.
- **NeedListList**: bir plandaki birden fazla ürün tek "Kaydet" ile
  güncelleniyor; yalnızca **gerçekten değişen** ürünler gönderiliyor (aksi
  halde dokunulmayan ürünlerde de "son güncelleyen" bilgisi yanlış değişiyordu).
- **SoforTaskDetail**: gereksiz açıklama metni kaldırıldı.
- **Acceptance**: "teslim edilen miktar" gösterimi kaldırıldı; "kabul+red
  bekleneni geçemez" kısıtı hem frontend hem backend'den kaldırıldı (gerçek
  sayım engellenmemeli).
- **Not zinciri tamamlandı**: Personel notu → Müdür ekranında görünüyor; Müdür
  notu → Şoför ekranında görünüyor; Şoför notu → Personel'in mal kabul
  ekranında görünüyor.
- **Ölü kod temizliği**: `App.js`'teki kullanılmayan iki placeholder ekran
  silindi (~150 satır).

### 4.4 — Bildirim sistemi düzeltmeleri (3 ayrı gerçek hata)

1. **React Native WebSocket "null chopping" hatası** — `@stomp/stompjs`
   kütüphanesinin bilinen bir sorunu: React Native'in WebSocket'i STOMP
   paketlerindeki NULL karakterini siliyor, bağlantı **sessizce** başarısız
   oluyor (hiç hata mesajı yok). `websocketService.js`'e
   `forceBinaryWSFrames: true` ve `appendMissingNULLonIncoming: true` eklendi
   + hata/kapanma logları eklendi.
2. **Ekranlar bildirim geldiğinde kendini yenilemiyordu** —
   `PurchaseManagement`, `NeedListList`, `ActiveTasks` ekranlarına
   `addNotificationListener` ile canlı yenileme eklendi (aktif düzenleme
   varsa yenilenmiyor, kullanıcı verisi kaybolmasın diye).
3. **Eksik bildirimler tamamlandı** — `updateNeedList`/`deleteNeedList`/
   `cancelNeedListPlan` artık planın müdürüne bildirim gönderiyor
   (`notifyPlanManager` — ALIM görevinin atandığı kişiye gider, önceden
   yalnızca plan OLUŞTURULUNCA bildirim gidiyordu). `CollectionService`'e
   eksik olan `TESLIMAT_GOREVI_ATANDI` bildirimi eklendi. `AcceptanceService`
   mal kabul tamamlanınca artık **personel + müdür + admin** üçüne birden
   bildirim gönderiyor (önceden yalnızca işlemi yapan kişiye, yani kendine
   gidiyordu — anlamsızdı).

### 4.5 — Dashboard/Özet ekranı: büyük yeniden tasarım

**Sorun:** "Miktar Farkları" bölümü anlaşılmaz duruyordu. Sebebi: plan daha
**bitmeden** (yalnızca Toplama sonrası) ham `AuditLog` kayıtlarını
gösteriyordu ve tek bir üründeki uçtan uca kayıp 4 ayrı parçalı karta
bölünüyordu.

**Çözüm:**
- Yeni `DashboardIssueResponse` DTO'su artık JSON string yerine düz sayılar
  taşıyor (`requiredQuantity, purchasedQuantity, collectedQuantity,
  acceptedQuantity, lossDetected, completedAt`).
- `DashboardService.findRecentIssues()` artık yalnızca **TAMAMLANMIŞ**
  planları tarıyor (bir planın Acceptance kaydı varsa tamamlanmıştır, çünkü
  kısmi mal kabul sistemde zaten yasak). `PlanSummaryService.buildSummary()`
  (özet mailiyle aynı kaynak) kullanılarak her ürün için TEK satır üretiliyor.
- **Dayanıklılık hatası bulundu ve düzeltildi**: eski/bozuk bir plan (need_list
  satırları silinmiş ama Acceptance kaydı kalmış — kullanıcının kendi önceki
  testinden kalma gerçek bir veri tutarsızlığı, plan #9) `buildSummary`'yi
  patlatıp **tüm** Özet ekranını çökertiyordu. Her plan artık try/catch ile
  korunuyor, bozuk bir plan yalnızca atlanıyor.
- Frontend `IssueCard.js` baştan yazıldı: "İhtiyaç → Alım → Toplama → Kabul"
  akışını ok işaretleriyle gösteren, farkın olduğu okun kırmızı/turuncu
  renklendiği görsel bir tasarım.
- Özet ekranı artık ayrı bir menü kartı (önceden ana ekrana gömülüydü) ve
  yalnızca **ADMIN + MAĞAZA_MÜDÜRÜ** görebiliyor (personel/şoför göremiyor).
- Canlı test doğrulandı: plan bitmeden hiç görünmüyor, bittiğinde sorunlu her
  ürün için tam olarak 1 kart çıkıyor.

### 4.6 — Bugün: kalan 4 mimari eksik tamamlandı

Kod okuma rehberi hazırlanırken tespit edilen, henüz çözülmemiş 4 madde:

1. **Entity'leri doğrudan döndüren 4 controller** düzeltildi — yeni
   `FruitResponse`, `SupplierResponse`, `TaskAssignmentResponse`,
   `DeliveryPlanResponse` DTO'ları oluşturuldu, ilgili Controller+Service
   çiftleri bunları kullanacak şekilde güncellendi.
   - Bu sırada **tehlikeli bir uç nokta bulundu ve kaldırıldı**:
     `POST /api/delivery-plans` hiçbir ekran tarafından kullanılmıyordu ama
     ürünsüz/sahipsiz plan oluşturmaya izin veriyordu — tam olarak yukarıdaki
     "plan #9 çöküşü"nün kök sebebiydi. Tamamen kaldırıldı; planlar artık
     yalnızca `POST /api/need-lists/plan` üzerinden, ürünleriyle birlikte
     oluşuyor. Kalan `GET` uçları admin'e kilitlendi.
2. **`@Valid` doğrulama eklendi** — `NeedListPlanRequest/Item`,
   `PurchasePlanRequest/Item`, `CollectionPlanRequest/Item` sınıflarına
   `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Positive`, `@PositiveOrZero`
   eklendi, ilgili 3 controller'da `@Valid` devreye alındı.
3. **Bu sırada bir hata daha bulundu**: `GlobalExceptionHandler`'ın genel
   yakalayıcısı, gerçek istemci hatalarını (yanlış HTTP metodu, bozuk JSON,
   eksik parametre) yanlışlıkla 500 "Sunucu hatası" olarak gösteriyordu.
   `HttpRequestMethodNotSupportedException` (→405), `HttpMessageNotReadableException`
   (→400), `MissingServletRequestParameterException` (→400),
   `MethodArgumentTypeMismatchException` (→400) için özel yakalayıcılar eklendi.
4. Canlı testte **14/14** kontrol geçti (frontend alanları bozulmadı,
   tedarikçi adres/telefonu artık sızmıyor, geçersiz istekler doğru mesajla
   reddediliyor, geçerli istek hâlâ çalışıyor).

### 4.7 — Kaza ve onarım (önemli, tekrar olmasın diye not düşülüyor)

Test sırasında **kendi test kullanıcılarım** (küçük id'li, çünkü sistem
görevleri en küçük id'li müdür/şoföre atıyor:
`findFirstByRoleOrderByIdAsc`) gerçek kullanıcının (Plan #40) görevlerini
üstüne çekti; test kullanıcıları silinince görevler **var olmayan
kullanıcılara** bağlı kaldı (yetim kayıt). Kullanıcı "her şey mahvolmuş,
şoföre görev düşmüyor" diye bildirdi. Kök sebep bulundu, görevler gerçek
sahiplerine (`ee` id 8, `emrekmbsr` id 13) taşındı, süresi sıfırlandı,
`audit_logs`'a onarım notu eklendi (geçmiş **silinmedi**, ek kayıt olarak
düşüldü — denetim kaydının doğru yöntemi bu). Para rakamlarının da doğru
olduğu ham veriyle doğrulandı (yanlış görünmesinin sebebi test verilerinin
karışmasıydı).

**Ders çıkarıldı:** Bundan sonra kullanıcının gerçek kullanıcılarından küçük
id'li test kullanıcısı oluşturulmayacak.

---

## 5. Şu Anki Durum

| Kontrol | Durum |
|---|---|
| Backend derlemesi (`mvnw compile`) | ✅ Temiz |
| Frontend söz dizimi (47 dosya, babel parser) | ✅ Temiz |
| Veritabanı — test kullanıcısı/yetim kayıt | ✅ Yok (defalarca doğrulandı) |
| Uçtan uca akış (İhtiyaç→Alım→Toplama→Teslimat→Kabul) | ✅ Canlı test edildi, gerçek verilerle |
| Otomatik kayıp tespiti | ✅ Şartnamedeki örnek senaryoyla birebir doğrulandı |
| Bildirim sistemi (4 rol, tüm aşamalar) | ✅ Canlı WebSocket testleriyle doğrulandı |
| **Gerçek telefonda/Expo'da elle tıklayarak test** | ❌ **HİÇ YAPILMADI** — tüm testler API seviyesinde (node script) |
| Git commit | ❌ **Hiç commit yapılmadı**, 39 dosya değişikliği bekliyor |
| Otomatik test (JUnit) | ❌ Yok, bilinen/kabul edilmiş eksik |

**En önemli açık nokta:** Backend'in doğruluğu çok sıkı test edildi, ama
React Native arayüzünün kendisi (buton bağlantıları, ekran render'ı, prop
isimleri) hiçbir zaman gerçek cihazda/Expo'da denenmedi. Kod tarafı sağlam
olsa bile arayüzde küçük bir yazım hatası olabilir — bunu ancak elle deneyerek
görürsün.

---

## 6. Cevabı Bekleyen / Karar Verilmemiş Konular

1. **Veritabanı şifresi düz metin.** `src/main/resources/application.properties`
   içinde `spring.datasource.password=kante1967` hâlâ açık yazıyor. Mail ve
   JWT için ortam değişkeni (`${MAIL_USERNAME:}` gibi) kullanılmış ama DB
   şifresi için kullanılmamış. Sorulmuş, henüz cevap gelmedi.
2. **Git commit yapılmadı.** 39 dosya (bugün eklenenlerle muhtemelen daha
   fazla) çalışma dizininde bekliyor. Bir şey ters giderse geri dönüş yolu yok.
3. **Görev dağıtımı tek kullanıcıya sabit** (bilinen/kabul edilmiş sınırlama,
   düzeltme istenirse konuşulacak): `findFirstByRoleOrderByIdAsc` her zaman
   en küçük id'li müdür/şoföre görev atıyor. İkinci bir şoför eklenirse asla
   görev almaz.

---

## 7. Kod Okuma İlerlemesi (kullanıcı için, 8-9 günlük plan)

Kapsamlı bir kod rehberi hazırlanıp yayınlandı:
**https://claude.ai/code/artifact/4fcdeaff-a665-411d-b97d-667a46c1db3f**

İçeriği: 30 saniyede proje özeti, her özelliğin izlediği ortak desen, 5
aşamalı ana akışın dosya:satır haritası, kritik soru-cevaplar (planId nasıl
doğuyor, updateNeedList akışı, şoförden fiyat nasıl gizleniyor, JWT/login,
görev süreleri), "projenin kalbi" (ConsistencyCheckService), dosya haritası,
8 günlük okuma planı, sunum hazırlığı (demo senaryosu + zor sorular).

**Canlı, rehberli kod okuma oturumu başlatıldı** (sohbet içinde, dosya
dosya değil "dikey dilim" mantığıyla — bir özelliği ekrandan veritabanına
kadar takip ederek):

- ✅ **Bölüm 1 — Giriş Akışı (Login) — TAMAMLANDI.** `Login/index.js` →
  `authService.js` → `httpClient.js` → *[internet]* → `AuthController.java`
  → `AuthService.java` zinciri, CLAUDE.md'nin istediği format (görevi / kim
  çağırıyor / hangi dosyayı çağırıyor / endpoint / veritabanı etkisi) ile
  satır satır anlatıldı. Kullanıcıya bunu kendi cümleleriyle anlatması
  istendi (öğrenme kontrolü).
- ⏳ **Bölüm 2 — İhtiyaç Planı Oluşturma** (planId'nin doğduğu yer,
  `NeedListService.createNeedListPlan`) — sırada, henüz başlanmadı.
- ⏳ **Bölüm 3 — Alım (müdür) + Toplama (şoför), fiyat gizleme mekanizması**
- ⏳ **Bölüm 4 — Teslimat + Mal Kabul, görev zincirinin bir sonrakine geçişi**
- ⏳ **Bölüm 5 — Denetim (ConsistencyCheckService) — projenin kalbi**

---

## 8. Sıradaki Adım

Yeni sayfada kaldığı yerden devam edilecekse: **Bölüm 2 — İhtiyaç Planı
Oluşturma** ile başla. Anahtar dosyalar:

- `frontend/src/pages/NeedListCreate/index.js`
- `frontend/src/services/needListService.js`
- `src/main/java/com/emre/meyvetakipsistemi/needlist/NeedListController.java`
- `src/main/java/com/emre/meyvetakipsistemi/needlist/NeedListService.java`
  (özellikle `createNeedListPlan` metodu, ~satır 120)

Ayrıca gündemde: (a) DB şifresi ortam değişkenine taşınsın mı — kullanıcıya
sor; (b) uygun bir noktada git commit önerilebilir (kullanıcı onayı olmadan
commit YAPILMAZ — proje kuralı); (c) kullanıcı gerçek cihazda elle test
etmeden "proje %100 hazır" denemeyeceği hatırlatılmalı.
