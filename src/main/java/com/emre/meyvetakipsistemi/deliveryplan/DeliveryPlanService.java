package com.emre.meyvetakipsistemi.deliveryplan;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

    // Yeni teslimat planı oluşturma.
    public DeliveryPlan createDeliveryPlan(DeliveryPlan deliveryPlan){

      if (deliveryPlan.getPlanStatus() == null) {
          deliveryPlan.setPlanStatus(PlanStatus.CREATED);
      }

      if (deliveryPlan.getCreatedDate() == null){
        deliveryPlan.setCreatedDate(LocalDateTime.now());
      }

      return deliveryPlanRepository.save(deliveryPlan);

    }

    public List<DeliveryPlan> getAllDeliveryPlans(){
        return deliveryPlanRepository.findAll();
    }

    public DeliveryPlan getDeliveryPlanById(Long id) {
        return deliveryPlanRepository.findById(id)
                .orElseThrow();

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
