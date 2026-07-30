package com.emre.meyvetakipsistemi.needlist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

// Yeni oluşturulan ihtiyaç planının (DeliveryPlan + NeedList satırları) özetini taşır.
@Getter
@AllArgsConstructor
public class NeedListPlanResponse {

    private Long planId;

    private String storeId;

    private String storeName;

    private LocalDateTime createdDate;

    private List<NeedListResponse> items;
}
