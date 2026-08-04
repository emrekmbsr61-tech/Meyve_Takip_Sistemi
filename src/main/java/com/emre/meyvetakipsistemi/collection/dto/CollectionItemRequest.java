package com.emre.meyvetakipsistemi.collection.dto;

import lombok.Getter;
import lombok.Setter;

// Bir ürün için şoförün girdiği bağımsız toplama sayımını taşır.
@Getter
@Setter
public class CollectionItemRequest {

    private Long fruitId;

    private Double collectedQuantity;

    private String notes;
}