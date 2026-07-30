package com.emre.meyvetakipsistemi.purchase.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Bir planın (henüz alınmamış) tüm ürünleri için alım kaydı oluşturma isteğini taşır.
@Getter
@Setter
public class PurchasePlanRequest {

    private Long planId;

    // Alımı yapan mağaza müdürünün id'sidir.
    private Long createdBy;

    private List<PurchaseItemRequest> items;
}
