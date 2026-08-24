package com.emre.meyvetakipsistemi.needlist;

import jakarta.validation.Valid;

import com.emre.meyvetakipsistemi.needlist.dto.AddExtraItemsRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

// Frontend'den gelen ihtiyaç listesi isteklerini karşılar.
@RestController
@RequestMapping("/api/need-lists")
@CrossOrigin(origins = "http://localhost:8081")
public class NeedListController {

    private final NeedListService needListService;

    // Spring, NeedListService nesnesini buradan otomatik verir.
    public NeedListController(NeedListService needListService) {
        this.needListService = needListService;
    }

    /*
      YENİ ve güvenli ihtiyaç planı oluşturma endpoint'i.
      Aynı transaction içinde önce bir DeliveryPlan oluşturur, planId'yi backend üretir,
      ardından tüm ürün satırlarını bu planId ile kaydeder. Frontend artık bu endpoint'i
      kullanmalıdır.
    */
    @PreAuthorize("hasRole('MAGAZA_PERSONELI')")
    @PostMapping("/plan")
    public ResponseEntity<?> createNeedListPlan(@Valid @RequestBody NeedListPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(needListService.createNeedListPlan(request));
    }

    /*
      Müdürün, var olan bir plana ekstra ürün eklemesini sağlar. Yeni bir
      DeliveryPlan/ihtiyaç planı OLUŞTURMAZ; aynı planId'ye yeni NeedList
      satırları ekler (bkz. NeedListService.addExtraItemsToPlan).
    */
    /*
      Plana ekstra ürün ekleme: müdür (Alım İşlemleri ekranından) veya personel
      (Mevcut İhtiyaçlar ekranından, yalnızca kendi planına). Personelin
      yalnızca kendi planına ekleyebilmesi Service'te ayrıca kontrol edilir.
    */
    @PreAuthorize("hasAnyRole('MAGAZA_MUDURU','MAGAZA_PERSONELI')")
    @PostMapping("/plan/{planId}/items")
    public ResponseEntity<?> addExtraItems(@PathVariable Long planId, @RequestBody AddExtraItemsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(needListService.addExtraItemsToPlan(planId, request));
    }

    // Bir planı (tüm ürünleriyle birlikte) iptal eder. Yalnızca bu planId'ye ait kayıtlar etkilenir.
    @PreAuthorize("hasRole('MAGAZA_PERSONELI')")
    @DeleteMapping("/plan/{planId}")
    public ResponseEntity<?> cancelNeedListPlan(@PathVariable Long planId, @RequestParam Long userId) {
        needListService.cancelNeedListPlan(planId, userId);
        return ResponseEntity.ok("Plan iptal edildi");
    }

    /*
      Tüm ihtiyaç listelerini getirir (Mevcut İhtiyaçlar ve Aktif Görevler ekranları).

      SOFOR bilerek DIŞARIDA bırakıldı: şoförün ihtiyaç miktarlarını görmesi,
      projenin temel kuralı olan bağımsız sayımı zayıflatır. Şoför yalnızca
      kendisine atanan görevleri görür.
    */
    @PreAuthorize("hasAnyRole('MAGAZA_PERSONELI','MAGAZA_MUDURU','ADMIN')")
    @GetMapping
    public List<NeedListResponse> getAllNeedLists() {
        return needListService.getAllNeedLists();
    }

    // ID'ye göre ihtiyaç listesini günceller. Sahiplik kontrolü ayrıca Service'te yapılır.
    @PreAuthorize("hasAnyRole('MAGAZA_PERSONELI','ADMIN')")
    @PutMapping("/{id}")
    public NeedListResponse updateNeedList(
            @PathVariable Long id,
            @RequestBody NeedListRequest request
    ) {
        return needListService.updateNeedList(id, request);
    }
}