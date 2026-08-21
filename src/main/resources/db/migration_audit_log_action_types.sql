-- ============================================================================
--  TEK SEFERLİK VERİTABANI DÜZELTMESİ
--  Ne zaman çalıştırılmalı: Bir enum'a (AuditActionType, TaskStatus, ...)
--  YENİ bir değer eklendiğinde.
-- ============================================================================
--
--  Sorun:
--  audit_logs.action_type sütununda, tablo ilk oluşturulurken Hibernate
--  tarafından üretilmiş bir CHECK kısıtı vardır ve o ANDAKİ enum değerlerini
--  listeler. spring.jpa.hibernate.ddl-auto=update ayarı yeni SÜTUN ekler ama
--  var olan CHECK kısıtını GÜNCELLEMEZ.
--
--  Sonuç: Enum'a yeni bir değer eklenince (ör. CONSISTENCY_CHECK) o türde log
--  yazma denemesi veritabanı tarafından reddedilir. Bu hata, log yazan asıl
--  işlemi de (toplama/mal kabul) komple geri aldırabilir.
--
--  Bu dosya kısıtı silip güncel enum değerleriyle yeniden oluşturur.
--
--  Çalıştırma:
--    psql -U postgres -d meyve_takip_sistemi -f src/main/resources/db/migration_audit_log_action_types.sql
-- ============================================================================

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_check CHECK (action_type IN (
    'USER_LOGIN',
    'USER_LOGIN_FAILED',
    'USER_LOGOUT',
    'NEED_LIST_CREATED',
    'NEED_LIST_UPDATED',
    'NEED_LIST_DELETED',
    'PURCHASE_CREATED',
    'PURCHASE_FAILED',
    'COLLECTION_CREATED',
    'ACCEPTANCE_CREATED',
    'TASK_COMPLETED',
    'TASK_ASSIGNED',
    'DELIVERY_PLAN_CREATED',
    'DELIVERY_PLAN_CANCELLED',
    'CONSISTENCY_CHECK',
    'SYSTEM_CHECK'
));

-- ----------------------------------------------------------------------------
--  TaskStatus enum'una OVERDUE eklendi (zamanı geçen görevleri arka planda
--  işaretleyen OverdueTaskScheduler bu değeri kullanır). Aynı sebeple eski
--  CHECK kısıtı bunu reddediyordu: görev "gecikti" olarak işaretlenemiyordu.
-- ----------------------------------------------------------------------------

ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;

ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_status_check CHECK (status IN (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'OVERDUE'
));

-- ----------------------------------------------------------------------------
--  TaskType enum'una GENEL eklendi (müdürün personele elle atadığı, bir ihtiyaç
--  planına bağlı OLMAYAN serbest görev - örn. "Depo temizliği").
--
--  Yukarıdakilerle BİREBİR aynı sebep: tablo ilk oluşturulurken üretilen CHECK
--  kısıtı yalnızca o günkü dört değeri tanıyordu, bu yüzden yeni tür görev
--  kaydedilemiyor ve şu hata alınıyordu:
--    new row for relation "task_assignments" violates check constraint
--    "task_assignments_task_type_check"
-- ----------------------------------------------------------------------------

ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_task_type_check;

ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_task_type_check CHECK (task_type IN (
    'ACCEPTANCE',
    'ALIM',
    'TOPLAMA',
    'TESLIMAT',
    'GENEL'
));
