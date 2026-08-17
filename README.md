# Meyve Takip Sistemi

Mağazaların meyve ihtiyaçlarını, halden yapılan alımları, şoför tarafından yapılan
toplama işlemlerini ve mağaza kabul sürecini takip eden bir staj projesidir.

## Projenin Amacı

Sistem bir sipariş takip uygulaması değil, bir **denetim** uygulamasıdır.
Her aşamada miktarları bağımsız olarak kaydeder ve bunları otomatik karşılaştırarak
hangi aşamada kayıp/hırsızlık olduğunu tespit eder.

Her personel kendi sayımını, bir önceki aşamanın miktarını **görmeden** girer:

- Müdür halden ne kadar aldığını girer (Purchase).
- Şoför kendi saydığı miktarı girer (Collection) — müdürün miktarını ve fiyatı göremez.
- Mağaza personeli kendi saydığı miktarı girer (Acceptance).

Sistem bu üç bağımsız sayımı ve baştaki ihtiyacı karşılaştırıp farkları
önem derecesiyle (SUCCESS / WARNING / ERROR / CRITICAL) `audit_logs` tablosuna yazar.

## Ana İş Akışı

```
NeedList  ->  Purchase  ->  Collection  ->  Teslimat  ->  Acceptance
(ihtiyaç)     (alım)        (toplama)                     (mal kabul)
```

Her aşama tamamlandığında bir sonraki aşamadan sorumlu personele süreli görev
otomatik atanır. Süre normalde 4 saattir; planda hızlı bozulan (`isPerishable`)
bir ürün varsa 2 saate düşer. Süresi geçen görevler arka planda çalışan
zamanlanmış görev tarafından otomatik olarak `OVERDUE` yapılır.

## Sistem Gereksinimleri

- Java 21 (JDK)
- PostgreSQL 14 veya üstü
- Node.js 20 veya üstü
- Expo Go uygulaması (fiziksel telefonda test için)

## Kurulum

### 1. Veritabanını hazırla

PostgreSQL'de boş bir veritabanı oluştur:

```bash
createdb meyve_takip_sistemi
```

Tablolar uygulama ilk açıldığında otomatik oluşturulur
(`spring.jpa.hibernate.ddl-auto=update`), ayrıca SQL çalıştırmana gerek yoktur.

Örnek meyve kayıtlarını yüklemek istersen:

```bash
psql -d meyve_takip_sistemi -f src/main/resources/static/fruits/fruits-insert.sql
```

### 2. Backend ayarlarını yap

`src/main/resources/application.properties` dosyasındaki veritabanı kullanıcı adı
ve parolasını kendi PostgreSQL kurulumuna göre düzenle.

E-posta doğrulama kodlarının gerçekten gönderilmesi için iki ortam değişkeni
tanımlanmalıdır (tanımlanmazsa uygulama yine açılır, sadece mail gönderimi başarısız olur):

```bash
export MAIL_USERNAME="ornek@gmail.com"
export MAIL_PASSWORD="uygulama-sifresi"
```

### 3. Backend'i çalıştır

```bash
./mvnw spring-boot:run
```

Backend `http://localhost:8080` adresinde açılır.
Swagger arayüzü: `http://localhost:8080/swagger-ui/index.html`

### 4. Frontend'i çalıştır

```bash
cd frontend
npm install
npx expo start
```

Backend adresi `frontend/src/config/api.js` dosyasından okunur:

- Android emulator: `http://10.0.2.2:8080/api`
- Fiziksel telefon: bilgisayarın yerel Wi-Fi IP adresi (ör. `http://192.168.1.20:8080/api`)
- Aynı ağda olduğundan emin ol; IP değişirse bu dosyayı güncellemen gerekir.

Farklı bir adres kullanmak istersen `EXPO_PUBLIC_API_URL` ortam değişkenini
tanımlayabilirsin; tanımlıysa yukarıdaki varsayılanların yerine o kullanılır.

## Kullanıcı Rolleri

| Rol | Yapabildikleri |
|---|---|
| `ADMIN` | Tüm kayıtları izler, kullanıcı onaylar, işlem kayıtlarını (AuditLog) görür |
| `MAGAZA_PERSONELI` | İhtiyaç listesi oluşturur, mal kabul sayımı yapar |
| `MAGAZA_MUDURU` | Alım kaydı ve fiyat girer, plana ekstra ürün ekler |
| `SOFOR` | Kendisine atanan toplama/teslimat görevlerini yapar, bağımsız sayım girer |
| `PENDING` | Kayıt olmuş ama henüz ADMIN tarafından rol atanmamış; giriş yapamaz |

Yeni kayıt olan her kullanıcı önce e-postasını doğrular, sonra ADMIN tarafından
kendisine bir rol atanana kadar giriş yapamaz.

## Modüller

`User` · `Fruit` · `DeliveryPlan` · `NeedList` · `Purchase` · `Collection` ·
`Acceptance` · `TaskAssignment` · `AuditLog` · `Supplier` · `PriceHistory` ·
`Dashboard` · `ConsistencyCheck`

## Teknolojiler

- Java 21, Spring Boot 3, Spring Data JPA, Spring Security (JWT)
- PostgreSQL
- WebSocket (STOMP) — anlık bildirimler
- React Native / Expo
- Swagger (OpenAPI)
