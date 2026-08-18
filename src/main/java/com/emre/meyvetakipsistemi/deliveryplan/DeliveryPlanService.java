package com.emre.meyvetakipsistemi.deliveryplan;

import com.emre.meyvetakipsistemi.deliveryplan.dto.DeliveryPlanResponse;
import com.emre.meyvetakipsistemi.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
/*

    Teslimat planı,
    NeedList, Purchase, Collection ve Acceptance süreçlerini
    ileride aynı planId üzerinden birbirine bağlayacak.

 */


@Service
public class DeliveryPlanService {

    @Autowired
    private DeliveryPlanRepository deliveryPlanRepository;

    /*
      Planlar yalnızca NeedListService.createNeedListPlan içinden, ürünleriyle
      birlikte oluşturulur; bu yüzden burada ayrı bir "plan oluştur" metodu yoktur.
      (Eski createDeliveryPlan metodu ürünsüz/sahipsiz plan yaratabildiği için
      kaldırıldı - bkz. DeliveryPlanController başındaki açıklama.)
    */

    public List<DeliveryPlanResponse> getAllDeliveryPlans() {
        return deliveryPlanRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public DeliveryPlanResponse getDeliveryPlanById(Long id) {
        DeliveryPlan plan = deliveryPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teslimat planı bulunamadı: " + id));

        return toResponse(plan);
    }

    // Entity'yi dışarı açılabilecek hâle çevirir.
    private DeliveryPlanResponse toResponse(DeliveryPlan plan) {
        return new DeliveryPlanResponse(
                plan.getId(),
                plan.getStoreId(),
                plan.getPlanStatus(),
                plan.getCreatedDate(),
                plan.getCompletedDate(),
                plan.getGeneralNotes()
        );
    }

    /*
      Bir planId için mağaza kimliği, mağaza adı ve planın genel notunu taşır
      (yalnızca görüntüleme amaçlı).

      generalNotes: İhtiyaç planı oluşturulurken yazılan "Plan Notu". Bu not
      DeliveryPlan kaydında saklanır; NeedList satırlarının kendi notlarından
      FARKLIDIR. Eskiden hiçbir yerde okunmadığı için ekranda hiç görünmüyordu.
    */
    public record PlanStoreInfo(String storeId, String storeName, String generalNotes) {
    }

    /*
      Bir planId için mağaza bilgisini çözer. Frontend hiçbir zaman mağaza adını
      planId üzerinden tahmin ETMEZ; bu bilgi her zaman buradan (backend'den) gelir.

      1) Gerçek bir DeliveryPlan kaydı varsa (yeni akış): storeId oradan alınır,
         adı StoreDirectory'den bulunur.
      2) Kayıt yoksa (eski/legacy NeedList satırı, DeliveryPlan hiç kullanılmadan
         önce oluşturulmuş): eski sistemde planId == mağaza id olduğu için aynı
         değer SADECE GÖRÜNTÜLEME amacıyla legacy eşleme olarak denenir.
      3) Hiçbir şekilde çözülemezse "Bilinmeyen Mağaza" gibi belirsiz bir metin
         DÖNMEZ; bunun yerine plan numarasını gösteren açık bir metin döner.
    */
    public PlanStoreInfo resolveStoreInfo(Long planId) {
        if (planId == null) {
            return new PlanStoreInfo(null, "Mağaza bilgisi yok", null);
        }

        return deliveryPlanRepository.findById(planId)
                .map(plan -> {
                    String storeId = plan.getStoreId();
                    String storeName = StoreDirectory.nameOf(storeId);
                    return new PlanStoreInfo(
                            storeId,
                            storeName != null ? storeName : "Mağaza #" + storeId,
                            plan.getGeneralNotes()
                    );
                })
                .orElseGet(() -> {
                    String legacyStoreId = String.valueOf(planId);
                    String legacyName = StoreDirectory.nameOf(legacyStoreId);
                    return legacyName != null
                            ? new PlanStoreInfo(legacyStoreId, legacyName, null)
                            : new PlanStoreInfo(null, "Eski Plan #" + planId, null);
                });
    }

}
