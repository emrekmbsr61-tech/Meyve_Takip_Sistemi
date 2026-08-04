package com.emre.meyvetakipsistemi.plansummary;

import org.springframework.http.HttpStatus;
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

    @GetMapping("/{planId}/summary")
    public ResponseEntity<?> getPlanSummary(@PathVariable Long planId, @RequestParam Long userId) {
        try {
            return ResponseEntity.ok(planSummaryService.getPlanSummary(userId, planId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}