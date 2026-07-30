package com.emre.meyvetakipsistemi.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// Seçilen planın ürünlerini ve ihtiyaç bilgilerini taşır.
@Getter
@AllArgsConstructor
public class PurchasePlanDetailResponse {

    private Long planId;

    private List<PurchasePlanItemResponse> items;
}
