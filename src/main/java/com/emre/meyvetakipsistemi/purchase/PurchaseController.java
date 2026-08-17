package com.emre.meyvetakipsistemi.purchase;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
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
        return ResponseEntity.ok(purchaseService.getPendingPurchasePlans(managerId));
    }

    // Seçilen planın ürünlerini ve ihtiyaç bilgilerini döner.
    @GetMapping("/plans/{planId}")
    public ResponseEntity<?> getPurchasePlanDetail(
            @PathVariable Long planId,
            @RequestParam Long managerId
    ) {
        return ResponseEntity.ok(purchaseService.getPurchasePlanDetail(managerId, planId));
    }

    // Bir planın tüm ürünleri için alım kaydı oluşturur.
    @PostMapping("/plan")
    public ResponseEntity<?> createPurchasesForPlan(@RequestBody PurchasePlanRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(purchaseService.createPurchasesForPlan(request));
        } catch (RuntimeException e) {
            /*
              Buradaki catch hatayı YUTMAZ; yalnızca başarısız alım denemesini
              loglamak içindir. Log yazıldıktan sonra hata tekrar fırlatılır ve
              cevabı GlobalExceptionHandler üretir - böylece hata biçimi diğer
              tüm endpoint'lerle aynı kalır.

              Not: purchaseService'in @Transactional metodu bu noktada zaten geri
              alınmıştır (rollback); bu yüzden buradaki log ayrı bir kayıt olarak kalır.
            */
            auditLogService.createLog(
                    request.getCreatedBy(),
                    "Bilinmeyen",
                    AuditActionType.PURCHASE_FAILED,
                    "Purchase",
                    request.getPlanId(),
                    e.getMessage(),
                    request.getPlanId(),
                    AuditStatus.ERROR,
                    null
            );

            throw e;
        }
    }
}
