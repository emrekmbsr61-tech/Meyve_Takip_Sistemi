package com.emre.meyvetakipsistemi.needlist.dto;

import lombok.Getter;
import lombok.Setter;

// Yeni ihtiyaç planındaki tek bir ürün satırını taşır.
@Getter
@Setter
public class NeedListPlanItemRequest {

    private Long fruitId;

    private Double requiredQuantity;

    private String notes;
}
