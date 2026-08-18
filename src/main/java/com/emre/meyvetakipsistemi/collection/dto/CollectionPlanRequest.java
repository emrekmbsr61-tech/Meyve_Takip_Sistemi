package com.emre.meyvetakipsistemi.collection.dto;

import jakarta.validation.constraints.NotNull;

import jakarta.validation.constraints.NotEmpty;

import jakarta.validation.Valid;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Bir planın tüm ürünleri için toplama kaydı oluşturma isteğini taşır.
@Getter
@Setter
public class CollectionPlanRequest {

    @NotNull(message = "Plan seçilmelidir")
    private Long planId;

    // Toplamayı yapan şoförün id'sidir.
    @NotNull(message = "Kullanıcı kimliği gereklidir")
    private Long createdBy;

    @NotEmpty(message = "En az bir ürün için toplama bilgisi girilmelidir")
    @Valid
    private List<CollectionItemRequest> items;
}