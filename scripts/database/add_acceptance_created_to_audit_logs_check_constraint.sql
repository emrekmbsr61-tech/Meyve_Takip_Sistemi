-- ============================================================================
-- audit_logs tablosundaki action_type CHECK constraint'ini güncel enum
-- değerleriyle senkronize eder (ACCEPTANCE_CREATED eklendi).
--
-- Kaynak (bu dosya elle değil, aşağıdaki Java dosyası okunarak hazırlandı):
--   src/main/java/com/emre/meyvetakipsistemi/auditlog/AuditActionType.java
--     -> USER_LOGIN, USER_LOGIN_FAILED,
--        NEED_LIST_CREATED, NEED_LIST_UPDATED, NEED_LIST_DELETED,
--        PURCHASE_CREATED, PURCHASE_FAILED,
--        COLLECTION_CREATED,
--        ACCEPTANCE_CREATED,                               <-- bu görevde eklendi
--        TASK_COMPLETED, TASK_ASSIGNED,
--        DELIVERY_PLAN_CREATED, DELIVERY_PLAN_CANCELLED
--
-- Not: add_collection_created_to_audit_logs_check_constraint.sql dosyasıyla
-- aynı desendir. Gerçek constraint adı tahmin edilmez; audit_logs tablosunda
-- action_type kolonu üzerinde tanımlı HER CHECK constraint'i (adı ne olursa
-- olsun) pg_constraint kataloğundan bularak kaldırır, ardından güncel enum
-- değerleriyle tek ve doğru constraint'i yeniden ekler.
--
-- Güvenlidir ve tekrar tekrar çalıştırılabilir (idempotent):
--   - Tabloyu SİLMEZ / yeniden oluşturmaz.
--   - Mevcut satırları SİLMEZ veya değiştirmez.
--   - Sadece action_type kolonunun CHECK constraint'ini günceller.
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
        WHERE rel.relname = 'audit_logs'
          AND con.contype = 'c'
          AND att.attname = 'action_type'
    LOOP
        EXECUTE format('ALTER TABLE audit_logs DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
END $$;

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_action_type_check
    CHECK (action_type IN (
        'USER_LOGIN', 'USER_LOGIN_FAILED',
        'NEED_LIST_CREATED', 'NEED_LIST_UPDATED', 'NEED_LIST_DELETED',
        'PURCHASE_CREATED', 'PURCHASE_FAILED',
        'COLLECTION_CREATED',
        'ACCEPTANCE_CREATED',
        'TASK_COMPLETED', 'TASK_ASSIGNED',
        'DELIVERY_PLAN_CREATED', 'DELIVERY_PLAN_CANCELLED'
    ));

COMMIT;