package com.emre.meyvetakipsistemi.collection.dto;

import jakarta.validation.constraints.Positive;

import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

// Bir ürün için şoförün girdiği bağımsız toplama sayımını taşır.
@Getter
@Setter
public class CollectionItemRequest {

    @NotNull(message = "Ürün seçilmelidir")
    private Long fruitId;

    @NotNull(message = "Toplanan miktar girilmelidir")
    @Positive(message = "Toplanan miktar sıfırdan büyük olmalıdır")
    private Double collectedQuantity;

    private String notes;
}