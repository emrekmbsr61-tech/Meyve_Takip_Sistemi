package com.emre.meyvetakipsistemi.purchase.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Bekleyen bir planın tek bir ürününe ait ihtiyaç bilgisini taşır.
@Getter
@AllArgsConstructor
public class PurchasePlanItemResponse {

    private Long needListId;

    private Long fruitId;

    private String fruitName;

    private String fruitCode;

    private FruitUnit fruitUnit;

    private Double requiredQuantity;

    // Bu ürün için daha önce alım kaydedilmiş mi?
    private boolean alreadyPurchased;
}
