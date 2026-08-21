package com.emre.meyvetakipsistemi.collection;

import jakarta.validation.Valid;

import com.emre.meyvetakipsistemi.collection.dto.CollectionPlanRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

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

    /*
      Bu modülün TAMAMI yalnızca SOFOR rolüne açıktır (@PreAuthorize).
      Sebebi denetim kuralıdır: toplama, şoförün BAĞIMSIZ sayımıdır. Başka bir
      rolün bu uçlara erişmesi, sayımın bağımsızlığını bozardı.
    */

    // Şoförün, kendisine atanmış bir TOPLAMA görevi için görebileceği güvenli plan detayını döner.
    @PreAuthorize("hasRole('SOFOR')")
    @GetMapping("/plans/{planId}")
    public ResponseEntity<?> getCollectionPlanDetail(
            @PathVariable Long planId,
            @RequestParam Long driverId
    ) {
        return ResponseEntity.ok(collectionService.getCollectionPlanDetail(driverId, planId));
    }

    // Şoförün Teslimat Görevi ekranında göreceği, kendi topladığı ürün/miktar özetini döner.
    @PreAuthorize("hasRole('SOFOR')")
    @GetMapping("/plans/{planId}/delivery-summary")
    public ResponseEntity<?> getDeliverySummary(
            @PathVariable Long planId,
            @RequestParam Long driverId
    ) {
        return ResponseEntity.ok(collectionService.getDeliverySummary(driverId, planId));
    }

    // Bir planın tüm ürünleri için toplama kaydı oluşturur.
    @PreAuthorize("hasRole('SOFOR')")
    @PostMapping("/plan")
    public ResponseEntity<?> createCollectionsForPlan(@Valid @RequestBody CollectionPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(collectionService.createCollectionsForPlan(request));
    }
}
