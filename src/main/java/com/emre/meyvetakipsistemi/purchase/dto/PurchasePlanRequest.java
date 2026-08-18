package com.emre.meyvetakipsistemi.purchase.dto;

import jakarta.validation.constraints.NotNull;

import jakarta.validation.constraints.NotEmpty;

import jakarta.validation.Valid;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Bir planın (henüz alınmamış) tüm ürünleri için alım kaydı oluşturma isteğini taşır.
@Getter
@Setter
public class PurchasePlanRequest {

    @NotNull(message = "Plan seçilmelidir")
    private Long planId;

    // Alımı yapan mağaza müdürünün id'sidir.
    @NotNull(message = "Kullanıcı kimliği gereklidir")
    private Long createdBy;

    @NotEmpty(message = "En az bir ürün için alım bilgisi girilmelidir")
    @Valid
    private List<PurchaseItemRequest> items;
}
