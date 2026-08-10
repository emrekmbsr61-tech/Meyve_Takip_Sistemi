-- ============================================================================
-- task_assignments tablosundaki task_type CHECK constraint'ini güncel enum
-- değerleriyle senkronize eder (TESLIMAT eklendi).
--
-- Kaynak (bu dosya elle değil, aşağıdaki Java dosyası okunarak hazırlandı):
--   src/main/java/com/emre/meyvetakipsistemi/task/TaskType.java
--     -> ACCEPTANCE, ALIM, TOPLAMA, TESLIMAT   <-- TESLIMAT bu görevde eklendi
--
-- Neden gerekiyor: Şoförün TOPLAMA (Alım Görevi) görevini tamamlamasının ardından
-- artık doğrudan mağaza personeline ACCEPTANCE (Kabul) görevi atanmıyor; önce aynı
-- şoföre bir TESLIMAT görevi atanıyor (bkz. CollectionService.completeToplamaAndAssignTeslimat).
-- Bu yeni değer veritabanının CHECK constraint'inde tanımlı olmadan task_assignments
-- tablosuna TESLIMAT türünde bir satır INSERT edilemez.
--
-- Not: fix_task_assignments_check_constraints.sql dosyasıyla aynı desendir, yalnızca
-- status constraint'ine dokunmaz (status enum'u değişmedi). Gerçek constraint adı
-- tahmin edilmez; task_assignments tablosunda task_type kolonu üzerinde tanımlı HER
-- CHECK constraint'i (adı ne olursa olsun) pg_constraint kataloğundan bularak kaldırır,
-- ardından güncel enum değerleriyle tek ve doğru constraint'i yeniden ekler.
--
-- Güvenlidir ve tekrar tekrar çalıştırılabilir (idempotent):
--   - Tabloyu SİLMEZ / yeniden oluşturmaz.
--   - Mevcut satırları SİLMEZ veya değiştirmez.
--   - Sadece task_type kolonunun CHECK constraint'ini günceller.
--
-- BU DOSYA OTOMATİK ÇALIŞTIRILMADI. Kullanıcı isterse kendisi çalıştırır.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT DISTINCT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
        WHERE rel.relname = 'task_assignments'
          AND con.contype = 'c'
          AND att.attname = 'task_type'
    LOOP
        EXECUTE format('ALTER TABLE task_assignments DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
END $$;

ALTER TABLE task_assignments
    ADD CONSTRAINT task_assignments_task_type_check
    CHECK (task_type IN ('ACCEPTANCE', 'ALIM', 'TOPLAMA', 'TESLIMAT'));

COMMIT;