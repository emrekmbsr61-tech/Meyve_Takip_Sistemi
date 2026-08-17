package com.emre.meyvetakipsistemi.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// Seçilen planın ürünlerini ve ihtiyaç bilgilerini taşır.
@Getter
@AllArgsConstructor
public class PurchasePlanDetailResponse {

    private Long planId;

    /*
      Personelin plan geneli için yazdığı not (DeliveryPlan.generalNotes).
      Ürün bazlı notlardan farklıdır; "Yeni İhtiyaç Planı" ekranındaki
      "Plan Notu" kutusuna yazılan metindir.
    */
    private String planNotes;

    private List<PurchasePlanItemResponse> items;
}
