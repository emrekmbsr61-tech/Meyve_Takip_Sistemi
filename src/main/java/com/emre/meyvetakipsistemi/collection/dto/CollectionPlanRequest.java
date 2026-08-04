package com.emre.meyvetakipsistemi.collection.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Bir planın tüm ürünleri için toplama kaydı oluşturma isteğini taşır.
@Getter
@Setter
public class CollectionPlanRequest {

    private Long planId;

    // Toplamayı yapan şoförün id'sidir.
    private Long createdBy;

    private List<CollectionItemRequest> items;
}