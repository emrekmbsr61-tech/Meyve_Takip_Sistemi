package com.emre.meyvetakipsistemi.plansummary;

import com.emre.meyvetakipsistemi.acceptance.Acceptance;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceItem;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceItemRepository;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceRepository;
import com.emre.meyvetakipsistemi.collection.Collection;
import com.emre.meyvetakipsistemi.collection.CollectionRepository;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.plansummary.dto.PlanSummaryItemResponse;
import com.emre.meyvetakipsistemi.plansummary.dto.PlanSummaryResponse;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/*
  Bir planın İhtiyaç (NeedList) -> Alım (Purchase) -> Toplama (Collection) ->
  Kabul (Acceptance) aşamalarını aynı planId + fruitId üzerinden karşılaştırıp
  denetim özeti üretir. Hiçbir entity doğrudan dışarı açılmaz, yalnızca
  plansummary/dto altındaki response sınıfları döner.
*/
@Service
public class PlanSummaryService {

    private final NeedListRepository needListRepository;
    private final PurchaseRepository purchaseRepository;
    private final CollectionRepository collectionRepository;
    private final AcceptanceRepository acceptanceRepository;
    private final AcceptanceItemRepository acceptanceItemRepository;
    private final FruitRepository fruitRepository;
    private final UserRepository userRepository;
    private final DeliveryPlanService deliveryPlanService;

    public PlanSummaryService(
            NeedListRepository needListRepository,
            PurchaseRepository purchaseRepository,
            CollectionRepository collectionRepository,
            AcceptanceRepository acceptanceRepository,
            AcceptanceItemRepository acceptanceItemRepository,
            FruitRepository fruitRepository,
            UserRepository userRepository,
            DeliveryPlanService deliveryPlanService
    ) {
        this.needListRepository = needListRepository;
        this.purchaseRepository = purchaseRepository;
        this.collectionRepository = collectionRepository;
        this.acceptanceRepository = acceptanceRepository;
        this.acceptanceItemRepository = acceptanceItemRepository;
        this.fruitRepository = fruitRepository;
        this.userRepository = userRepository;
        this.deliveryPlanService = deliveryPlanService;
    }

    /*
      Bir planın denetim özetini üretir. Şoför bu endpoint'i çağıramaz
      (requireViewer) — Purchase miktarını asla görmemesi gerektiği kuralı
      burada da korunur.
    */
    public PlanSummaryResponse getPlanSummary(Long userId, Long planId) {
        requireViewer(userId);

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        // Aynı planda aynı meyve için birden fazla NeedList kaydı olabilir; diğer
        // servislerle (Purchase/Collection) aynı desenle fruitId bazında birleştirilir.
        Map<Long, Double> requiredByFruit = new LinkedHashMap<>();

        for (NeedList need : needs) {
            requiredByFruit.merge(need.getFruitId(), need.getRequiredQuantity(), Double::sum);
        }

        boolean allApproved = needs.stream().allMatch(need -> need.getStatus() == NeedListStatus.APPROVED);

        Map<Long, Double> purchasedByFruit = new LinkedHashMap<>();
        // "Sonucu Gör" ekranında gösterilecek alış/satış fiyatı bilgisi de aynı Purchase
        // kaydından, ek bir sorgu gerekmeden okunur.
        Map<Long, java.math.BigDecimal> unitPriceByFruit = new LinkedHashMap<>();
        Map<Long, java.math.BigDecimal> salesPriceByFruit = new LinkedHashMap<>();
        for (Purchase purchase : purchaseRepository.findByPlanId(planId)) {
            purchasedByFruit.put(purchase.getFruitId(), purchase.getPurchasedQuantity());
            unitPriceByFruit.put(purchase.getFruitId(), purchase.getUnitPrice());
            salesPriceByFruit.put(purchase.getFruitId(), purchase.getSalesPrice());
        }

        Map<Long, Double> collectedByFruit = new LinkedHashMap<>();
        for (Collection collection : collectionRepository.findByPlanId(planId)) {
            collectedByFruit.put(collection.getFruitId(), collection.getCollectedQuantity());
        }

        // AcceptanceItem'da planId doğrudan tutulmuyor; önce bu plana ait Acceptance
        // kayıtları, ardından onların satırları (AcceptanceItem) bulunur.
        Map<Long, Double> acceptedByFruit = new LinkedHashMap<>();
        Map<Long, Double> rejectedByFruit = new LinkedHashMap<>();
        // planId + fruitId eşsiz olduğu için (uk_acceptance_items_plan_fruit) her meyvenin en fazla bir notu olur.
        Map<Long, String> noteByFruit = new LinkedHashMap<>();
        for (Acceptance acceptance : acceptanceRepository.findByPlanId(planId)) {
            for (AcceptanceItem item : acceptanceItemRepository.findByAcceptanceId(acceptance.getId())) {
                if (item.getAcceptedQuantity() != null) {
                    acceptedByFruit.merge(item.getFruitId(), item.getAcceptedQuantity(), Double::sum);
                }
                if (item.getRejectedQuantity() != null) {
                    rejectedByFruit.merge(item.getFruitId(), item.getRejectedQuantity(), Double::sum);
                }
                if (item.getRejectionReason() != null && !item.getRejectionReason().isBlank()) {
                    noteByFruit.put(item.getFruitId(), item.getRejectionReason());
                }
            }
        }

        List<PlanSummaryItemResponse> items = new ArrayList<>();
        int inconsistentCount = 0;

        for (Map.Entry<Long, Double> entry : requiredByFruit.entrySet()) {
            PlanSummaryItemResponse item = buildItem(
                    entry.getKey(),
                    entry.getValue(),
                    purchasedByFruit.get(entry.getKey()),
                    collectedByFruit.get(entry.getKey()),
                    acceptedByFruit.get(entry.getKey()),
                    rejectedByFruit.get(entry.getKey()),
                    unitPriceByFruit.get(entry.getKey()),
                    salesPriceByFruit.get(entry.getKey()),
                    noteByFruit.get(entry.getKey())
            );

            if (!item.isConsistent()) {
                inconsistentCount++;
            }

            items.add(item);
        }

        boolean hasMissingStage = items.stream().anyMatch(item ->
                item.getPurchasedQuantity() == null
                        || item.getCollectedQuantity() == null
                        || item.getAcceptedQuantity() == null
        );

        String workflowStatus = allApproved ? "TAMAMLANDI" : "DEVAM_EDIYOR";
        String consistencyStatus = inconsistentCount > 0 ? "WARNING" : "CONSISTENT";
        String summaryMessage = buildSummaryMessage(items.size(), inconsistentCount, hasMissingStage);

        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(planId);

        return new PlanSummaryResponse(
                planId,
                storeInfo.storeId(),
                storeInfo.storeName(),
                workflowStatus,
                consistencyStatus,
                items.size(),
                inconsistentCount,
                summaryMessage,
                items
        );
    }

    // Tek bir ürün için 4 aşama miktarını karşılaştırıp güvenli response satırını üretir.
    private PlanSummaryItemResponse buildItem(
            Long fruitId,
            Double required,
            Double purchased,
            Double collected,
            Double accepted,
            Double rejected,
            java.math.BigDecimal unitPrice,
            java.math.BigDecimal salesPrice,
            String note
    ) {
        Fruit fruit = fruitRepository.findById(fruitId).orElse(null);
        FruitUnit unit = fruit == null ? null : fruit.getUnit();

        Double needPurchaseDiff = purchased != null ? round(purchased - required) : null;
        Double purchaseCollectionDiff = (purchased != null && collected != null) ? round(collected - purchased) : null;
        Double collectionAcceptanceDiff = (collected != null && accepted != null) ? round(accepted - collected) : null;
        Double needAcceptanceDiff = accepted != null ? round(accepted - required) : null;
        Double deliveryDiff = collected != null ? round(collected - required) : null;

        List<String> issues = new ArrayList<>();

        if (purchased == null) {
            issues.add("ALIM AŞAMASI: Bu ürün için henüz alım kaydı girilmemiş.");
        } else if (isNonZero(needPurchaseDiff)) {
            issues.add("ALIM AŞAMASI: İhtiyaç " + formatQuantity(required, unit) + ", alım "
                    + formatQuantity(purchased, unit) + ". Alım aşamasında "
                    + formatDifference(needPurchaseDiff, unit) + ".");
        }

        if (purchased != null && collected == null) {
            issues.add("HAL/TOPLAMA AŞAMASI: Bu ürün için henüz toplama kaydı girilmemiş.");
        } else if (isNonZero(purchaseCollectionDiff)) {
            issues.add("HAL/TOPLAMA AŞAMASI: Alım " + formatQuantity(purchased, unit) + ", toplama "
                    + formatQuantity(collected, unit) + ". Toplama aşamasında "
                    + formatDifference(purchaseCollectionDiff, unit) + ".");
        }

        if (collected != null && accepted == null) {
            issues.add("TAŞIMA/KABUL AŞAMASI: Bu ürün için henüz mal kabul kaydı girilmemiş.");
        } else if (isNonZero(collectionAcceptanceDiff)) {
            issues.add("TAŞIMA/KABUL AŞAMASI: Toplama " + formatQuantity(collected, unit) + ", kabul "
                    + formatQuantity(accepted, unit) + ". Kabul aşamasında "
                    + formatDifference(collectionAcceptanceDiff, unit) + ".");
        }

        if (isNonZero(needAcceptanceDiff)) {
            issues.add("MAĞAZA SONUCU: Mağaza ihtiyacı " + formatDifference(needAcceptanceDiff, unit) + " karşılandı.");
        }

        boolean consistent = !isNonZero(needPurchaseDiff)
                && !isNonZero(purchaseCollectionDiff)
                && !isNonZero(collectionAcceptanceDiff)
                && !isNonZero(needAcceptanceDiff);

        return new PlanSummaryItemResponse(
                fruitId,
                fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                unit,
                required,
                purchased,
                collected,
                accepted,
                rejected,
                unitPrice,
                salesPrice,
                needPurchaseDiff,
                purchaseCollectionDiff,
                collectionAcceptanceDiff,
                needAcceptanceDiff,
                deliveryDiff,
                note,
                issues,
                consistent
        );
    }

    private String buildSummaryMessage(int totalProductCount, int inconsistentCount, boolean hasMissingStage) {
        if (inconsistentCount > 0) {
            return "Planın " + totalProductCount + " üründen " + inconsistentCount
                    + " tanesinde miktar farkı tespit edildi.";
        }

        if (hasMissingStage) {
            return "Planın " + totalProductCount + " ürününde şu ana kadar miktar farkı bulunmadı, "
                    + "ancak bazı ürünlerde alım/toplama/kabul aşamaları henüz tamamlanmadı.";
        }

        return "Planın " + totalProductCount + " ürününde miktar farkı bulunamadı, tüm aşamalar tutarlı.";
    }

    // Ondalık çıkarma işlemlerinde oluşabilecek küçük kayan nokta hatalarını (ör. 0.00000001) temizler.
    private Double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private boolean isNonZero(Double value) {
        return value != null && value != 0;
    }

    // FruitUnit'i ekranda gösterilecek Türkçe birime çevirir (frontend'deki getUnitLabel ile aynı eşleme).
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

    // Bir miktarı "1.5 Kilo" / "2 Kilo" gibi okunabilir bir metne çevirir (tam sayıda ondalık gösterilmez).
    private String formatQuantity(double value, FruitUnit unit) {
        return formatNumber(value) + " " + unitLabel(unit);
    }

    // Fark değerini geliştirici biçiminde ("-1", "+2") DEĞİL, mutlak değer + "eksik"/"fazla" olarak yazar.
    private String formatDifference(double diff, FruitUnit unit) {
        return formatNumber(Math.abs(diff)) + " " + unitLabel(unit) + (diff < 0 ? " eksik" : " fazla");
    }

    private String formatNumber(double value) {
        return (value == Math.floor(value)) ? String.valueOf((long) value) : String.valueOf(value);
    }

    // Çağıranın var olan ve bu özeti görüntüleyebilecek bir kullanıcı olduğunu doğrular.
    // SOFOR kesinlikle giremez: Purchase miktarını hiçbir zaman görmemelidir.
    private User requireViewer(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_PERSONELI
                && user.getRole() != UserRole.MAGAZA_MUDURU
                && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu işlem için yetkiniz yok");
        }

        return user;
    }
}