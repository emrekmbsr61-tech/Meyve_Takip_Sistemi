-- ============================================================================
-- acceptance_items tablosuna plan_id kolonunu ekler, mevcut satırları geriye
-- dönük olarak acceptances tablosundan doldurur ve (plan_id, fruit_id) için
-- UNIQUE constraint ekler. Amaç: aynı plan + aynı ürün için ikinci bir mal
-- kabul kaydının veritabanı seviyesinde de oluşturulamamasını garanti etmek
-- (bkz. AcceptanceService.create() / uk_acceptance_items_plan_fruit).
--
-- ÖNEMLİ NOT (gerçek tablo yapısı incelendi): acceptance_items tablosu planId'yi
-- doğrudan taşımıyordu; yalnızca acceptance_id (acceptances tablosuna bağlanan
-- kimlik) tutuyordu ve planId acceptances tablosundaydı. Purchase/Collection'daki
-- gibi TEK tabloda (plan_id, fruit_id) UNIQUE constraint kurabilmek için bu
-- migration önce plan_id kolonunu acceptance_items'a ekleyip dolduruyor.
--
-- Güvenlidir:
--   - Hiçbir satırı SİLMEZ.
--   - plan_id kolonu var olan satırlarda acceptances.plan_id'den dolduruluyor;
--     veri kaybı yok.
--   - Tekrar tekrar çalıştırılabilir (idempotent) — kolon/constraint zaten
--     varsa atlanır.
--   - Duplicate (plan_id, fruit_id) kaydı varsa constraint eklenmeden ÖNCE
--     migration RAISE EXCEPTION ile anlaşılır bir hata verip durur; hiçbir
--     satır otomatik silinmez.
-- ============================================================================

BEGIN;

-- 1) plan_id kolonunu ekle (yoksa)
ALTER TABLE acceptance_items ADD COLUMN IF NOT EXISTS plan_id BIGINT;

-- 2) Var olan satırları, ilişkili acceptances kaydından planId ile doldur
UPDATE acceptance_items ai
SET plan_id = a.plan_id
FROM acceptances a
WHERE ai.acceptance_id = a.id
  AND ai.plan_id IS NULL;

-- 3) Duplicate (plan_id, fruit_id) varsa migration'ı anlaşılır bir hatayla durdur
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT plan_id, fruit_id
        FROM acceptance_items
        WHERE plan_id IS NOT NULL
        GROUP BY plan_id, fruit_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'acceptance_items tablosunda % adet tekrarlanan (plan_id, fruit_id) kaydı var; UNIQUE constraint eklenemedi. Önce bu kayıtları elle inceleyip düzeltin.', duplicate_count;
    END IF;
END $$;

-- 4) Artık güvenle UNIQUE constraint eklenebilir (varsa tekrar eklemeye çalışmaz)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_acceptance_items_plan_fruit'
    ) THEN
        ALTER TABLE acceptance_items
            ADD CONSTRAINT uk_acceptance_items_plan_fruit UNIQUE (plan_id, fruit_id);
    END IF;
END $$;

COMMIT;