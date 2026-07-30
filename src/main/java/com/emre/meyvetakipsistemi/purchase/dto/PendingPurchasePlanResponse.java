package com.emre.meyvetakipsistemi.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// Alımı henüz tamamlanmamış bir planın özet bilgisini taşır.
@Getter
@AllArgsConstructor
public class PendingPurchasePlanResponse {

    private Long planId;

    // Planın ait olduğu mağazanın kimliği (DeliveryPlan.storeId üzerinden gelir; eski/legacy
    // kayıtlarda DeliveryPlan yoksa null olabilir).
    private String storeId;

    // Ekranda gösterilecek mağaza adı — backend tarafından çözülür (bkz. DeliveryPlanService.resolveStoreInfo).
    private String storeName;

    private LocalDateTime createdDate;

    private int itemCount;
}
