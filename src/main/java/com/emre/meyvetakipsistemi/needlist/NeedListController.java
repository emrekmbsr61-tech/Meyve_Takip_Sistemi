package com.emre.meyvetakipsistemi.needlist;

import com.emre.meyvetakipsistemi.needlist.dto.AddExtraItemsRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // Yeni ihtiyaç listesi oluşturur.
    // Not: Bu eski endpoint planId'yi client'tan kabul eder, artık YENİ akış için kullanılmamalı.
    @PostMapping
    public NeedListResponse createNeedList(@RequestBody NeedListRequest request) {
        return needListService.createNeedList(request);
    }

    /*
      YENİ ve güvenli ihtiyaç planı oluşturma endpoint'i.
      Aynı transaction içinde önce bir DeliveryPlan oluşturur, planId'yi backend üretir,
      ardından tüm ürün satırlarını bu planId ile kaydeder. Frontend artık bu endpoint'i
      kullanmalıdır.
    */
    @PostMapping("/plan")
    public ResponseEntity<?> createNeedListPlan(@RequestBody NeedListPlanRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(needListService.createNeedListPlan(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /*
      Müdürün, var olan bir plana ekstra ürün eklemesini sağlar. Yeni bir
      DeliveryPlan/ihtiyaç planı OLUŞTURMAZ; aynı planId'ye yeni NeedList
      satırları ekler (bkz. NeedListService.addExtraItemsToPlan).
    */
    @PostMapping("/plan/{planId}/items")
    public ResponseEntity<?> addExtraItems(@PathVariable Long planId, @RequestBody AddExtraItemsRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(needListService.addExtraItemsToPlan(planId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Bir planı (tüm ürünleriyle birlikte) iptal eder. Yalnızca bu planId'ye ait kayıtlar etkilenir.
    @DeleteMapping("/plan/{planId}")
    public ResponseEntity<?> cancelNeedListPlan(@PathVariable Long planId, @RequestParam Long userId) {
        try {
            needListService.cancelNeedListPlan(planId, userId);
            return ResponseEntity.ok("Plan iptal edildi");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Tüm ihtiyaç listelerini getirir.
    @GetMapping
    public List<NeedListResponse> getAllNeedLists() {
        return needListService.getAllNeedLists();
    }

    // ID'ye göre ihtiyaç listesi getirir.
    @GetMapping("/{id}")
    public NeedListResponse getNeedListById(@PathVariable Long id) {
        return needListService.getNeedListById(id);
    }

    // ID'ye göre ihtiyaç listesini siler.
    @DeleteMapping("/{id}")
    public void deleteNeedList(@PathVariable Long id) {
        needListService.deleteNeedList(id);
    }

    // ID'ye göre ihtiyaç listesini günceller.
    @PutMapping("/{id}")
    public NeedListResponse updateNeedList(
            @PathVariable Long id,
            @RequestBody NeedListRequest request
    ) {
        return needListService.updateNeedList(id, request);
    }
}