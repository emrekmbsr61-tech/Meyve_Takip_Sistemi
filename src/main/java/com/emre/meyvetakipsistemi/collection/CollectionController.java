package com.emre.meyvetakipsistemi.collection;

import com.emre.meyvetakipsistemi.collection.dto.CollectionPlanRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/*
  ŞOFÖR'ün TOPLAMA görevi kapsamındaki toplama (Collection) isteklerini karşılar.

  Hata yönetimi: Burada try/catch YOKTUR. Service'ten fırlatılan hatalar
  GlobalExceptionHandler tarafından yakalanır ve frontend'e her zaman aynı
  biçimde (ErrorResponse) JSON olarak döner.
*/
@RestController
@RequestMapping("/api/collections")
@CrossOrigin(origins = "*")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    // Şoförün, kendisine atanmış bir TOPLAMA görevi için görebileceği güvenli plan detayını döner.
    @GetMapping("/plans/{planId}")
    public ResponseEntity<?> getCollectionPlanDetail(
            @PathVariable Long planId,
            @RequestParam Long driverId
    ) {
        return ResponseEntity.ok(collectionService.getCollectionPlanDetail(driverId, planId));
    }

    // Şoförün Teslimat Görevi ekranında göreceği, kendi topladığı ürün/miktar özetini döner.
    @GetMapping("/plans/{planId}/delivery-summary")
    public ResponseEntity<?> getDeliverySummary(
            @PathVariable Long planId,
            @RequestParam Long driverId
    ) {
        return ResponseEntity.ok(collectionService.getDeliverySummary(driverId, planId));
    }

    // Bir planın tüm ürünleri için toplama kaydı oluşturur.
    @PostMapping("/plan")
    public ResponseEntity<?> createCollectionsForPlan(@RequestBody CollectionPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(collectionService.createCollectionsForPlan(request));
    }
}
