package com.emre.meyvetakipsistemi.consistency;

import com.emre.meyvetakipsistemi.acceptance.Acceptance;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceItem;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceItemRepository;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceRepository;
import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import com.emre.meyvetakipsistemi.collection.Collection;
import com.emre.meyvetakipsistemi.collection.CollectionRepository;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/*
  ================== PROJENİN ANA AMACI: HIRSIZLIK / KAYIP TESPİTİ ==================

  Bir aşama kaydedilir kaydedilmez (Toplama veya Mal Kabul), sistem OTOMATİK olarak
  aynı planId + fruitId üzerinden dört karşılaştırma yapar ve sonucu AuditLog'a
  önem derecesiyle birlikte yazar:

    1) İhtiyaç  vs Alım     -> WARNING   (planlama hatası: yeterli sipariş edilmemiş)
    2) Alım     vs Toplama  -> CRITICAL  (HAL'de kayıp/hırsızlık)
    3) Toplama  vs Kabul    -> CRITICAL  (taşıma sırasında kayıp/hırsızlık)
    4) İhtiyaç  vs Kabul    -> ERROR     (mağazanın ihtiyacı karşılanmadı)

  PlanSummaryService'ten farkı: orası kullanıcı "Sonucu Gör" dediğinde çalışan,
  hiçbir yere kaydetmeyen bir RAPOR ekranıdır. Burası ise kullanıcı hiçbir şey
  yapmasa bile çalışan ve bulgularını kalıcı olarak AuditLog'a yazan DENETİMDİR.

  Önemli tasarım kararı: bu kontrol, çağıran servisin @Transactional bloğu
  içinde çalışır. Buradaki beklenmedik bir hata yüzünden şoförün/personelin
  gerçek kaydının geri alınmaması için tüm kontrol try/catch ile sarılır -
  denetim hiçbir zaman asıl işi engellemez.
*/
@Service
public class ConsistencyCheckService {

    private final NeedListRepository needListRepository;
    private final PurchaseRepository purchaseRepository;
    private final CollectionRepository collectionRepository;
    private final AcceptanceRepository acceptanceRepository;
    private final AcceptanceItemRepository acceptanceItemRepository;
    private final FruitRepository fruitRepository;
    private final AuditLogService auditLogService;

    public ConsistencyCheckService(
            NeedListRepository needListRepository,
            PurchaseRepository purchaseRepository,
            CollectionRepository collectionRepository,
            AcceptanceRepository acceptanceRepository,
            AcceptanceItemRepository acceptanceItemRepository,
            FruitRepository fruitRepository,
            AuditLogService auditLogService
    ) {
        this.needListRepository = needListRepository;
        this.purchaseRepository = purchaseRepository;
        this.collectionRepository = collectionRepository;
        this.acceptanceRepository = acceptanceRepository;
        this.acceptanceItemRepository = acceptanceItemRepository;
        this.fruitRepository = fruitRepository;
        this.auditLogService = auditLogService;
    }

    // Tek bir karşılaştırmanın sonucunu taşır.
    private record Finding(AuditStatus status, String message, String details) {
    }

    /*
      Kontrolün hangi aşama tamamlandığı için çalıştığını belirtir.

      Neden gerekli: Kontrol hem Toplama hem Mal Kabul sonrasında çalışır. Her
      seferinde BÜTÜN karşılaştırmalar yapılsaydı, Toplama'da yazılan bulgular
      Kabul'de ikinci kez yazılır ve loglar tekrar ederdi (testte tam olarak bu
      görüldü). Bu yüzden her aşama YALNIZCA kendisiyle mümkün hale gelen
      karşılaştırmaları loglar.
    */
    public enum CheckStage {
        // Toplama kaydedildi: İhtiyaç-Alım ve Alım-Toplama karşılaştırılabilir.
        AFTER_COLLECTION,
        // Mal kabul kaydedildi: Toplama-Kabul ve İhtiyaç-Kabul karşılaştırılabilir.
        AFTER_ACCEPTANCE
    }

    /*
      Bir plan için tutarlılık kontrollerini çalıştırır ve bulguları loglar.
      userId / userFullName: kontrolü tetikleyen işlemi yapan kişi (loga yazılır).
    */
    public void runCheck(Long planId, Long userId, String userFullName, CheckStage stage) {
        try {
            List<Finding> findings = collectFindings(planId, stage);

            if (findings.isEmpty()) {
                auditLogService.createLogSafely(
                        userId, userFullName, AuditActionType.CONSISTENCY_CHECK,
                        "Plan", planId,
                        "Plan #" + planId + ": Miktarlar tutarlı, fark tespit edilmedi.",
                        planId, AuditStatus.SUCCESS, null
                );
                return;
            }

            for (Finding finding : findings) {
                auditLogService.createLogSafely(
                        userId, userFullName, AuditActionType.CONSISTENCY_CHECK,
                        "Plan", planId,
                        finding.message(),
                        planId, finding.status(), finding.details()
                );
            }
        } catch (Exception exception) {
            /*
              Denetim asla asıl işlemi bozmamalıdır. Buraya düşülürse kontrol
              yapılamamıştır ama şoförün/personelin kaydı geçerli kalır.
              Bu son log da createLogSafely ile yazılır: aksi halde hatayı
              raporlama denemesinin kendisi asıl işlemi çökertebilirdi.
            */
            auditLogService.createLogSafely(
                    userId, userFullName, AuditActionType.CONSISTENCY_CHECK,
                    "Plan", planId,
                    "Plan #" + planId + ": Tutarlılık kontrolü çalıştırılamadı.",
                    planId, AuditStatus.ERROR,
                    jsonOf("hata", exception.getMessage() == null ? "bilinmiyor" : exception.getMessage())
            );
        }
    }

    // Planın tüm ürünleri için, verilen aşamaya ait karşılaştırmaları yapar.
    private List<Finding> collectFindings(Long planId, CheckStage stage) {
        Map<Long, Double> requiredByFruit = new LinkedHashMap<>();
        for (NeedList need : needListRepository.findByPlanId(planId)) {
            requiredByFruit.merge(need.getFruitId(), need.getRequiredQuantity(), Double::sum);
        }

        Map<Long, Double> purchasedByFruit = new LinkedHashMap<>();
        for (Purchase purchase : purchaseRepository.findByPlanId(planId)) {
            purchasedByFruit.put(purchase.getFruitId(), purchase.getPurchasedQuantity());
        }

        Map<Long, Double> collectedByFruit = new LinkedHashMap<>();
        for (Collection collection : collectionRepository.findByPlanId(planId)) {
            collectedByFruit.put(collection.getFruitId(), collection.getCollectedQuantity());
        }

        // AcceptanceItem'da planId doğrudan tutulmaz; önce plana ait Acceptance
        // kayıtları, sonra onların satırları okunur (PlanSummaryService ile aynı desen).
        Map<Long, Double> acceptedByFruit = new LinkedHashMap<>();
        for (Acceptance acceptance : acceptanceRepository.findByPlanId(planId)) {
            for (AcceptanceItem item : acceptanceItemRepository.findByAcceptanceId(acceptance.getId())) {
                if (item.getAcceptedQuantity() != null) {
                    acceptedByFruit.merge(item.getFruitId(), item.getAcceptedQuantity(), Double::sum);
                }
            }
        }

        List<Finding> findings = new ArrayList<>();

        for (Map.Entry<Long, Double> entry : requiredByFruit.entrySet()) {
            Long fruitId = entry.getKey();
            Double required = entry.getValue();
            Double purchased = purchasedByFruit.get(fruitId);
            Double collected = collectedByFruit.get(fruitId);
            Double accepted = acceptedByFruit.get(fruitId);

            Fruit fruit = fruitRepository.findById(fruitId).orElse(null);
            String fruitName = fruit == null ? "Bilinmeyen meyve" : fruit.getName();
            FruitUnit unit = fruit == null ? null : fruit.getUnit();

            if (stage == CheckStage.AFTER_COLLECTION) {
                // 1) İhtiyaç vs Alım - yeterli miktar sipariş edilmiş mi?
                addFinding(findings, planId, fruitId, fruitName, unit,
                        "IHTIYAC-ALIM", "İhtiyaç", required, "Alım", purchased,
                        AuditStatus.WARNING, AuditStatus.WARNING,
                        "Planlama hatası: sipariş edilen miktar ihtiyaçla uyuşmuyor.");

                // 2) Alım vs Toplama - HAL'de kayıp/hırsızlık var mı?
                addFinding(findings, planId, fruitId, fruitName, unit,
                        "ALIM-TOPLAMA", "Alım", purchased, "Toplama", collected,
                        AuditStatus.CRITICAL, AuditStatus.WARNING,
                        "HIRSIZLIK/KAYIP ŞÜPHESİ: Halde alınan miktar ile toplanan miktar tutmuyor.");
            }

            if (stage == CheckStage.AFTER_ACCEPTANCE) {
                // 3) Toplama vs Kabul - taşıma sırasında kayıp/hırsızlık var mı?
                addFinding(findings, planId, fruitId, fruitName, unit,
                        "TOPLAMA-KABUL", "Toplama", collected, "Kabul", accepted,
                        AuditStatus.CRITICAL, AuditStatus.WARNING,
                        "HIRSIZLIK/KAYIP ŞÜPHESİ: Taşıma sırasında miktar değişmiş.");

                // 4) İhtiyaç vs Kabul - mağazaya gerçekten yeterli geldi mi?
                addFinding(findings, planId, fruitId, fruitName, unit,
                        "IHTIYAC-KABUL", "İhtiyaç", required, "Kabul", accepted,
                        AuditStatus.ERROR, AuditStatus.WARNING,
                        "Mağazanın ihtiyacı karşılanmadı.");
            }
        }

        return findings;
    }

    /*
      İki aşamayı karşılaştırır; fark varsa listeye bir bulgu ekler.
      İki aşamadan biri henüz girilmemişse (null) karşılaştırma atlanır -
      "henüz yapılmamış" bir aşama hata değildir.

      shortageStatus : ikinci miktar birinciden AZ ise kullanılacak önem derecesi.
      surplusStatus  : ikinci miktar birinciden FAZLA ise kullanılacak derece
                       (fazlalık genelde hırsızlık değildir, bu yüzden daha hafiftir).
    */
    private void addFinding(
            List<Finding> findings,
            Long planId,
            Long fruitId,
            String fruitName,
            FruitUnit unit,
            String stageCode,
            String firstLabel,
            Double firstValue,
            String secondLabel,
            Double secondValue,
            AuditStatus shortageStatus,
            AuditStatus surplusStatus,
            String reason
    ) {
        if (firstValue == null || secondValue == null) {
            return;
        }

        double difference = round(secondValue - firstValue);

        if (difference == 0) {
            return;
        }

        boolean shortage = difference < 0;
        AuditStatus status = shortage ? shortageStatus : surplusStatus;

        String message = "Plan #" + planId + " - " + fruitName + ": "
                + firstLabel + " " + formatQuantity(firstValue, unit) + ", "
                + secondLabel + " " + formatQuantity(secondValue, unit) + ". "
                + formatNumber(Math.abs(difference)) + " " + unitLabel(unit)
                + (shortage ? " eksik! " : " fazla. ")
                + reason;

        String details = "{"
                + "\"asama\":" + jsonString(stageCode) + ","
                + "\"fruitId\":" + fruitId + ","
                + "\"urun\":" + jsonString(fruitName) + ","
                + "\"birim\":" + jsonString(unit == null ? "BILINMIYOR" : unit.name()) + ","
                + "\"" + asciiKey(firstLabel) + "\":" + firstValue + ","
                + "\"" + asciiKey(secondLabel) + "\":" + secondValue + ","
                + "\"fark\":" + difference
                + "}";

        findings.add(new Finding(status, message, details));
    }

    // Ondalık çıkarmada oluşan küçük kayan nokta hatalarını temizler (ör. 0.00000001).
    private double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private String formatQuantity(double value, FruitUnit unit) {
        return formatNumber(value) + " " + unitLabel(unit);
    }

    private String formatNumber(double value) {
        return (value == Math.floor(value)) ? String.valueOf((long) value) : String.valueOf(value);
    }

    // Birim adını okunabilir hale getirir. Yeni bir FruitUnit eklenirse de çalışır.
    private String unitLabel(FruitUnit unit) {
        if (unit == null) {
            return "birim";
        }

        return switch (unit) {
            case KG -> "Kilo";
            case ADET -> "Adet";
            case KASA -> "Kasa";
        };
    }

    // JSON anahtarlarında Türkçe karakter kullanmamak için sadeleştirir.
    private String asciiKey(String label) {
        return label.toLowerCase()
                .replace("ı", "i").replace("İ", "i")
                .replace("ç", "c").replace("ş", "s")
                .replace("ğ", "g").replace("ö", "o").replace("ü", "u");
    }

    private String jsonOf(String key, String value) {
        return "{" + jsonString(key) + ":" + jsonString(value) + "}";
    }

    // Metni JSON içinde güvenle kullanılabilecek şekilde tırnaklar.
    private String jsonString(String value) {
        if (value == null) {
            return "null";
        }

        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
