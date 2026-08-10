package com.emre.meyvetakipsistemi.collection;

import com.emre.meyvetakipsistemi.collection.dto.CollectionPlanRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// ŞOFÖR'ün TOPLAMA görevi kapsamındaki toplama (Collection) isteklerini karşılar.
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
        try {
            return ResponseEntity.ok(collectionService.getCollectionPlanDetail(driverId, planId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Şoförün Teslimat Görevi ekranında göreceği, kendi topladığı ürün/miktar özetini döner.
    @GetMapping("/plans/{planId}/delivery-summary")
    public ResponseEntity<?> getDeliverySummary(
            @PathVariable Long planId,
            @RequestParam Long driverId
    ) {
        try {
            return ResponseEntity.ok(collectionService.getDeliverySummary(driverId, planId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Bir planın tüm ürünleri için toplama kaydı oluşturur.
    @PostMapping("/plan")
    public ResponseEntity<?> createCollectionsForPlan(@RequestBody CollectionPlanRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(collectionService.createCollectionsForPlan(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}