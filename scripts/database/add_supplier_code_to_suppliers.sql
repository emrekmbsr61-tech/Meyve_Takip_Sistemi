-- ============================================================================
-- suppliers tablosuna supplier_code (tedarikçi kodu) kolonunu ekler.
--
-- Kaynak: src/main/java/com/emre/meyvetakipsistemi/supplier/Supplier.java
--   -> supplierCode alanı bu görevde eklendi.
--
-- Not: spring.jpa.hibernate.ddl-auto=update ayarı bu kolonu otomatik olarak
-- da ekleyebilir, ama buna güvenilmemesi istendiği için migration burada
-- açıkça tanımlanmıştır.
--
-- Güvenlidir ve tekrar tekrar çalıştırılabilir (idempotent):
--   - Mevcut satırları SİLMEZ veya değiştirmez.
--   - Kolon zaten varsa hata vermez (IF NOT EXISTS).
--   - supplier_code NULL olabilir (mevcut kayıtlar bozulmaz); PostgreSQL'de
--     UNIQUE index birden fazla NULL değere izin verdiği için bu, benzersizlik
--     kuralıyla çakışmaz.
-- ============================================================================

BEGIN;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uk_suppliers_supplier_code ON suppliers (supplier_code);

COMMIT;
