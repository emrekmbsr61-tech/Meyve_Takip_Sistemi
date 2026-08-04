package com.emre.meyvetakipsistemi.collection.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// Şoförün toplama ekranında göreceği planın güvenli detayını taşır.
@Getter
@AllArgsConstructor
public class CollectionPlanDetailResponse {

    private Long planId;

    private String storeId;

    private String storeName;

    private List<CollectionPlanItemResponse> items;
}