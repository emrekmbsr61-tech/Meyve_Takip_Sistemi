package com.emre.meyvetakipsistemi.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// Alım kaydı başarıyla tamamlandığında frontend'e dönen özet bilgidir.
@Getter
@AllArgsConstructor
public class PurchaseResultResponse {

    private Long planId;

    private int purchasedItemCount;

    private String message;
}
