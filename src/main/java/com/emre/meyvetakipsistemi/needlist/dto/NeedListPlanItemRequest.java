package com.emre.meyvetakipsistemi.needlist.dto;

import jakarta.validation.constraints.Positive;

import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

// Yeni ihtiyaç planındaki tek bir ürün satırını taşır.
@Getter
@Setter
public class NeedListPlanItemRequest {

    @NotNull(message = "Ürün seçilmelidir")
    private Long fruitId;

    @NotNull(message = "Geçerli bir miktar girilmelidir")
    @Positive(message = "Miktar sıfırdan büyük olmalıdır")
    private Double requiredQuantity;

    private String notes;
}
