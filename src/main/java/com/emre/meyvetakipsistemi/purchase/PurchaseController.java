package com.emre.meyvetakipsistemi.purchase;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.purchase.dto.PurchasePlanRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// MAGAZA_MUDURU'nün alım (Purchase) isteklerini karşılar.
@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final AuditLogService auditLogService;

    public PurchaseController(PurchaseService purchaseService, AuditLogService auditLogService) {
        this.purchaseService = purchaseService;
        this.auditLogService = auditLogService;
    }

    // Alımı henüz tamamlanmamış planları döner.
    @GetMapping("/pending-plans")
    public ResponseEntity<?> getPendingPurchasePlans(@RequestParam Long managerId) {
        try {
            return ResponseEntity.ok(purchaseService.getPendingPurchasePlans(managerId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Seçilen planın ürünlerini ve ihtiyaç bilgilerini döner.
    @GetMapping("/plans/{planId}")
    public ResponseEntity<?> getPurchasePlanDetail(
            @PathVariable Long planId,
            @RequestParam Long managerId
    ) {
        try {
            return ResponseEntity.ok(purchaseService.getPurchasePlanDetail(managerId, planId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Bir planın tüm ürünleri için alım kaydı oluşturur.
    @PostMapping("/plan")
    public ResponseEntity<?> createPurchasesForPlan(@RequestBody PurchasePlanRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(purchaseService.createPurchasesForPlan(request));
        } catch (RuntimeException e) {
            /*
              Not: Bu noktada purchaseService'in @Transactional metodu zaten hata
              fırlatıp geri alınmış (rollback) durumdadır. Bu yüzden burada log
              atmak, başarısız işlemle birlikte geri alınmaz; ayrı bir kayıt olarak kalır.
            */
            auditLogService.createLog(
                    request.getCreatedBy(),
                    "Bilinmeyen",
                    AuditActionType.PURCHASE_FAILED,
                    "Purchase",
                    request.getPlanId(),
                    e.getMessage()
            );

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
