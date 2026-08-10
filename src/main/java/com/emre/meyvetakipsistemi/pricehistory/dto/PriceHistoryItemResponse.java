package com.emre.meyvetakipsistemi.pricehistory.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Bir ürünün geçmişteki tek bir alış fiyat kaydını taşır.
@Getter
@AllArgsConstructor
public class PriceHistoryItemResponse {

    private BigDecimal price;

    private LocalDateTime date;
}
