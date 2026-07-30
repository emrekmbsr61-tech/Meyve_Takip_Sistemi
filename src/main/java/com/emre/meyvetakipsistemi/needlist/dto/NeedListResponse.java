package com.emre.meyvetakipsistemi.needlist.dto;

import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// Backend'den frontend'e dönecek ihtiyaç listesi bilgisidir.
@Getter
@AllArgsConstructor
public class NeedListResponse {

    private Long id;
    private Long planId;

    // Planın ait olduğu mağazanın kimliği (DeliveryPlan.storeId üzerinden gelir; eski/legacy
    // kayıtlarda DeliveryPlan yoksa null olabilir).
    private String storeId;

    // Ekranda gösterilecek mağaza adı — backend tarafından çözülür (bkz. DeliveryPlanService.resolveStoreInfo).
    // Frontend bu alanı planId üzerinden TAHMİN ETMEZ, doğrudan gösterir.
    private String storeName;

    private Long fruitId;
    private String fruitName;
    private String fruitCode;
    private FruitUnit fruitUnit;

    private Double requiredQuantity;

    private Long createdBy;
    private String createdByName;

    private LocalDateTime createdDate;
    private String notes;
    private NeedListStatus status;

    // Bu ikisi yalnızca kayıt gerçekten güncellenmişse dolu gelir (AuditLog'dan türetilir).
    private String updatedByName;
    private LocalDateTime updatedDate;
}
