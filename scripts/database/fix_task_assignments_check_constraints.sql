-- ============================================================================
-- task_assignments tablosundaki task_type ve status CHECK constraint'lerini
-- güncel enum değerleriyle senkronize eder.
--
-- Kaynak (bu dosya elle değil, aşağıdaki Java dosyaları okunarak hazırlandı):
--   src/main/java/com/emre/meyvetakipsistemi/task/TaskType.java
--     -> ACCEPTANCE, ALIM, TOPLAMA
--   src/main/java/com/emre/meyvetakipsistemi/task/TaskStatus.java
--     -> PENDING, IN_PROGRESS, COMPLETED
--
-- Not: Gerçek constraint adları tahmin edilmedi. Aşağıdaki DO bloğu,
-- task_assignments tablosunda task_type ve status kolonları üzerinde
-- tanımlı HER CHECK constraint'ini (adı ne olursa olsun) pg_constraint
-- kataloğundan bularak kaldırır, ardından güncel enum değerleriyle tek ve
-- doğru constraint'i yeniden ekler.
--
-- Güvenlidir ve tekrar tekrar çalıştırılabilir (idempotent):
--   - Tabloyu SİLMEZ / yeniden oluşturmaz.
--   - Mevcut satırları SİLMEZ veya değiştirmez.
--   - Sadece ilgili iki kolonun CHECK constraint'lerini günceller.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- task_type kolonu üzerindeki (adı ne olursa olsun) tüm CHECK constraint'lerini kaldır.
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

    -- status kolonu üzerindeki (adı ne olursa olsun) tüm CHECK constraint'lerini kaldır.
    FOR constraint_record IN
        SELECT DISTINCT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
        WHERE rel.relname = 'task_assignments'
          AND con.contype = 'c'
          AND att.attname = 'status'
    LOOP
        EXECUTE format('ALTER TABLE task_assignments DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
END $$;

-- Güncel enum değerleriyle constraint'leri yeniden, tek ve bilinen isimle ekle.
ALTER TABLE task_assignments
    ADD CONSTRAINT task_assignments_task_type_check
    CHECK (task_type IN ('ACCEPTANCE', 'ALIM', 'TOPLAMA'));

ALTER TABLE task_assignments
    ADD CONSTRAINT task_assignments_status_check
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'));

COMMIT;
