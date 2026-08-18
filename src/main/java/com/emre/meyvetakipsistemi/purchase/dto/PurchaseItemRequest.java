package com.emre.meyvetakipsistemi.purchase.dto;

import jakarta.validation.constraints.PositiveOrZero;

import jakarta.validation.constraints.Positive;

import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

// Bir ürün için müdürün girdiği alım bilgisini taşır.
@Getter
@Setter
public class PurchaseItemRequest {

    @NotNull(message = "Ürün seçilmelidir")
    private Long fruitId;

    @NotNull(message = "Alınan miktar girilmelidir")
    @Positive(message = "Alınan miktar sıfırdan büyük olmalıdır")
    private Double purchasedQuantity;

    @NotNull(message = "Alış fiyatı girilmelidir")
    @PositiveOrZero(message = "Alış fiyatı negatif olamaz")
    private BigDecimal unitPrice;

    private BigDecimal salesPrice;

    @NotNull(message = "Tedarikçi seçilmelidir")
    private Long supplierId;

    private String notes;
}
