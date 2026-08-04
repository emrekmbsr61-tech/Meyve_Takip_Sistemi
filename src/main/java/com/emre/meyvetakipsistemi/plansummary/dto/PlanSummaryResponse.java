package com.emre.meyvetakipsistemi.plansummary.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// Bir planın İhtiyaç -> Alım -> Toplama -> Kabul denetim özetini taşır.
@Getter
@AllArgsConstructor
public class PlanSummaryResponse {

    private Long planId;
    private String storeId;
    private String storeName;

    // Planın iş akışı durumu: "TAMAMLANDI" (tüm ürünler mal kabulden geçti) veya "DEVAM_EDIYOR".
    private String workflowStatus;

    // Miktar karşılaştırma durumu: "CONSISTENT" (fark yok) veya "WARNING" (en az bir üründe miktar farkı var).
    private String consistencyStatus;

    private int totalProductCount;
    private int inconsistentProductCount;

    private String summaryMessage;

    private List<PlanSummaryItemResponse> items;
}