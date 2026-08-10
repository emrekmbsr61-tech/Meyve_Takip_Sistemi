package com.emre.meyvetakipsistemi.collection.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// Şoförün Teslimat Görevi ekranında göreceği plan/mağaza/ürün özetini taşır.
@Getter
@AllArgsConstructor
public class DeliverySummaryResponse {

    private Long planId;

    private String storeId;

    private String storeName;

    private List<DeliverySummaryItemResponse> items;
}