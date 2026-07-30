package com.emre.meyvetakipsistemi.purchase.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

// Bir ürün için müdürün girdiği alım bilgisini taşır.
@Getter
@Setter
public class PurchaseItemRequest {

    private Long fruitId;

    private Double purchasedQuantity;

    private BigDecimal unitPrice;

    private BigDecimal salesPrice;

    private Long supplierId;

    private String notes;
}
