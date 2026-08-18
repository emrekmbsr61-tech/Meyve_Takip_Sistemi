package com.emre.meyvetakipsistemi.deliveryplan;

import com.emre.meyvetakipsistemi.deliveryplan.dto.DeliveryPlanResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
  Teslimat planlarını salt okunur olarak listeler (yönetici gözetimi içindir).

  ÖNEMLİ - burada bilinçli olarak "plan oluşturma" endpoint'i YOKTUR:
  Bir plan yalnızca POST /api/need-lists/plan üzerinden, ürünleriyle BİRLİKTE
  ve tek transaction içinde oluşturulur (bkz. NeedListService.createNeedListPlan).
  Daha önce burada bulunan POST /api/delivery-plans, ürünü olmayan boş bir plan
  yaratılmasına izin veriyordu; böyle sahipsiz bir plan sonraki aşamalarda
  "bu plana ait ihtiyaç kaydı bulunamadı" hatasına yol açar. Hiçbir ekran bu
  endpoint'i kullanmadığı için kaldırıldı.
*/
@RestController
@RequestMapping("/api/delivery-plans")
public class DeliveryPlanController {

    @Autowired
    private DeliveryPlanService deliveryPlanService;

    // Sistemdeki tüm teslimat planlarını listeler.
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<DeliveryPlanResponse> getAllDeliveryPlans() {
        return deliveryPlanService.getAllDeliveryPlans();
    }

    // Id değerine göre tek bir teslimat planı getirir.
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public DeliveryPlanResponse getDeliveryPlanById(@PathVariable Long id) {
        return deliveryPlanService.getDeliveryPlanById(id);
    }
}
