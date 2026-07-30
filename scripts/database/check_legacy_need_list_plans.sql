-- ============================================================================
-- (İSTEĞE BAĞLI, SALT OKUMA) Eski/legacy NeedList planlarını tespit eder.
--
-- Arka plan: Bu değişiklikten ÖNCE her yeni ihtiyaç planı, mağazanın
-- frontend'deki sabit planId değerini (1-10 arası) tekrar tekrar kullanıyordu.
-- Bu düzeltmeden SONRA her yeni plan, gerçek ve otomatik üretilen bir
-- DeliveryPlan.id değerini kullanıyor. DeliveryPlan tablosu daha önce hiç
-- kullanılmadığı için id sayacı 1'den başlayacak — bu da eski planId
-- değerleriyle (1-10) çakışabilir.
--
-- Bu betik HİÇBİR VERİYİ SİLMEZ VEYA DEĞİŞTİRMEZ. Yalnızca inceleme amaçlıdır.
-- Aşağıdaki sorgu, need_list tablosunda bulunan ama delivery_plans tablosunda
-- KARŞILIĞI OLMAYAN planId değerlerini listeler — yani muhtemelen bu
-- düzeltmeden önce oluşturulmuş eski/test kayıtlarıdır.
--
-- Bu kayıtları görüntüledikten sonra siz karar verirsiniz:
--   a) Öylece bırakabilirsiniz (yeni akışı etkilemezler),
--   b) İlgili plan_id değerleri için elle bir delivery_plans satırı
--      oluşturup doğru store_id'yi girerek mağaza adının ekranda doğru
--      görünmesini sağlayabilirsiniz,
--   c) Gerçekten test verisiyse, siz karar verip elle silebilirsiniz
--      (bu betik bunu OTOMATİK yapmaz).
-- ============================================================================

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
