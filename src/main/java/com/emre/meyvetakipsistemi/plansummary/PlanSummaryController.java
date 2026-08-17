package com.emre.meyvetakipsistemi.plansummary;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Bir planın İhtiyaç -> Alım -> Toplama -> Kabul aşamalarını karşılaştıran denetim özetini döner.
@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = "*")
public class PlanSummaryController {

    private final PlanSummaryService planSummaryService;

    public PlanSummaryController(PlanSummaryService planSummaryService) {
        this.planSummaryService = planSummaryService;
    }

    // Hata yönetimi merkezidir (bkz. GlobalExceptionHandler); burada try/catch yoktur.
    @GetMapping("/{planId}/summary")
    public ResponseEntity<?> getPlanSummary(@PathVariable Long planId, @RequestParam Long userId) {
        return ResponseEntity.ok(planSummaryService.getPlanSummary(userId, planId));
    }
}