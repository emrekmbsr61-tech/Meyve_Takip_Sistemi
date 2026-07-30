-- ============================================================================
-- delivery_plans.id sayacını (sequence), hem delivery_plans.id hem de
-- need_list.plan_id içindeki EN BÜYÜK değerin üstüne ilerletir.
--
-- Amaç: Gelecekte üretilecek yeni DeliveryPlan id'lerinin, DeliveryPlan tablosu
-- hiç kullanılmadan önce oluşturulmuş eski/legacy need_list.plan_id değerleriyle
-- (örn. 1-10) çakışmasını önlemek.
--
-- GÜVENLİ VE TEKRAR ÇALIŞTIRILABİLİR:
--   - Hiçbir satırı SİLMEZ veya DEĞİŞTİRMEZ (yalnızca sequence ilerletilir).
--   - Sequence'i sadece İLERİYE taşır; hesaplanan hedef değer sequence'in şu anki
--     durumundan küçükse HİÇBİR ŞEY YAPMAZ (asla geri almaz).
--   - Sequence adını tahmin etmez; pg_get_serial_sequence(...) ile PostgreSQL'den
--     güvenli şekilde bulur.
--   - Birden fazla kez çalıştırılabilir; ikinci çalıştırmada değişiklik yapmaz.
-- ============================================================================

DO $$
DECLARE
    seq_name text;
    target_value bigint;
    current_value bigint;
BEGIN
    seq_name := pg_get_serial_sequence('delivery_plans', 'id');

    IF seq_name IS NULL THEN
        RAISE EXCEPTION 'delivery_plans.id için bir sequence bulunamadı. Tablo yapısını kontrol edin.';
    END IF;

    SELECT GREATEST(
        COALESCE((SELECT MAX(id) FROM delivery_plans), 0),
        COALESCE((SELECT MAX(plan_id) FROM need_list), 0)
    ) INTO target_value;

    EXECUTE format('SELECT last_value FROM %s', seq_name) INTO current_value;

    IF target_value > current_value THEN
        PERFORM setval(seq_name, target_value, true);
        RAISE NOTICE 'delivery_plans sequence % ilerletildi: % -> %', seq_name, current_value, target_value;
    ELSE
        RAISE NOTICE 'delivery_plans sequence % zaten yeterince ileride (mevcut: %, hedef: %). Değişiklik yapılmadı.', seq_name, current_value, target_value;
    END IF;
END $$;
