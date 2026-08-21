package com.emre.meyvetakipsistemi.deliveryplan;

import com.emre.meyvetakipsistemi.deliveryplan.dto.DeliveryPlanResponse;
import com.emre.meyvetakipsistemi.deliveryplan.dto.PlanProgressResponse;
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

    @Autowired
    private PlanProgressService planProgressService;

    /*
      "Devam Eden İşlemler": tamamlanmamış planların şu an hangi aşamada
      beklediğini döner (bkz. PlanProgressService).

      Yolun sabit kısmı ("/in-progress"), aşağıdaki "/{id}" kalıbından ÖNCE
      tanımlanır; aksi halde Spring "in-progress" metnini bir id sanabilirdi.
    */
    @PreAuthorize("hasAnyRole('ADMIN','MAGAZA_MUDURU')")
    @GetMapping("/in-progress")
    public List<PlanProgressResponse> getInProgressPlans(@RequestParam Long userId) {
        return planProgressService.getInProgressPlans(userId);
    }

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
