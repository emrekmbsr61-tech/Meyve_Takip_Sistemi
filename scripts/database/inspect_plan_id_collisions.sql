-- ============================================================================
-- (SALT OKUMA) need_list.plan_id ile delivery_plans.id çakışmalarını tespit eder.
--
-- Arka plan: DeliveryPlan tablosu bu düzeltmeden önce hiç kullanılmıyordu.
-- Eski sistemde her mağazanın sabit bir planId'si vardı (frontend/src/config/stores.js
-- dosyasının eski hâlinde 1-10 arası). Artık her yeni plan, delivery_plans tablosunun
-- otomatik id sayacından (IDENTITY) gerçek bir değer alıyor. Bu sayaç 1'den başladığı
-- için yeni üretilen id'ler eski, hardcoded planId değerleriyle (1-10) çakışabilir.
--
-- Bu betik HİÇBİR VERİYİ SİLMEZ VEYA DEĞİŞTİRMEZ. Yalnızca inceleme amaçlıdır.
-- ============================================================================

-- 1) need_list tablosundaki tüm plan_id değerleri ve kaç üründen oluştukları.
SELECT
    'need_list' AS kaynak,
    nl.plan_id,
    COUNT(*) AS urun_sayisi,
    MIN(nl.created_date) AS ilk_olusturma_tarihi,
    MAX(nl.created_date) AS son_olusturma_tarihi
FROM need_list nl
GROUP BY nl.plan_id
ORDER BY nl.plan_id;

-- 2) delivery_plans tablosundaki tüm gerçek plan id değerleri.
SELECT
    'delivery_plans' AS kaynak,
    dp.id AS plan_id,
    dp.store_id,
    dp.plan_status,
    dp.created_date
FROM delivery_plans dp
ORDER BY dp.id;

-- 3) ÇAKIŞMA RİSKİ: aynı plan_id değeri hem need_list'te (DeliveryPlan'dan ÖNCE
--    oluşturulmuş eski bir kayıt olarak) hem de delivery_plans'ta (yeni akışla
--    gerçekten oluşturulmuş bir plan olarak) birden fazla farklı created_date
--    grubunda görünüyorsa, bu numara iki farklı "plan"ı temsil ediyor demektir.
--    Aşağıdaki sorgu, delivery_plans'ta karşılığı OLAN ama need_list'teki en eski
--    kaydı delivery_plans'ın oluşturulma tarihinden daha ÖNCEKİ bir tarihte olan
--    (yani muhtemelen eski/legacy bir kayıt olan) plan_id değerlerini işaretler.
SELECT
    dp.id AS plan_id,
    dp.store_id AS yeni_plan_store_id,
    dp.created_date AS yeni_plan_tarihi,
    MIN(nl.created_date) AS need_list_en_eski_kayit_tarihi,
    COUNT(nl.id) AS need_list_kayit_sayisi
FROM delivery_plans dp
JOIN need_list nl ON nl.plan_id = dp.id
GROUP BY dp.id, dp.store_id, dp.created_date
HAVING MIN(nl.created_date) < dp.created_date
ORDER BY dp.id;

-- 4) DeliveryPlan karşılığı OLMAYAN eski/legacy planlar (bkz. check_legacy_need_list_plans.sql
--    ile aynı sonuç, burada tekrar verilmiştir — kolliziyon analizini tek dosyada tutmak için).
SELECT
    nl.plan_id,
    COUNT(*) AS urun_sayisi,
    MIN(nl.created_date) AS ilk_olusturma_tarihi,
    MAX(nl.created_date) AS son_olusturma_tarihi
FROM need_list nl
LEFT JOIN delivery_plans dp ON dp.id = nl.plan_id
WHERE dp.id IS NULL
GROUP BY nl.plan_id
ORDER BY nl.plan_id;

-- 5) Sıradaki yeni DeliveryPlan id'sinin ne olacağını görmek için sequence durumu.
--    (advance_delivery_plan_sequence.sql çalıştırılmadan ÖNCE ve SONRA karşılaştırmak için kullanılabilir.)
SELECT
    pg_get_serial_sequence('delivery_plans', 'id') AS sequence_adi,
    (SELECT last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename = split_part(pg_get_serial_sequence('delivery_plans', 'id'), '.', 2)) AS su_anki_deger,
    (SELECT COALESCE(MAX(id), 0) FROM delivery_plans) AS delivery_plans_max_id,
    (SELECT COALESCE(MAX(plan_id), 0) FROM need_list) AS need_list_max_plan_id;
