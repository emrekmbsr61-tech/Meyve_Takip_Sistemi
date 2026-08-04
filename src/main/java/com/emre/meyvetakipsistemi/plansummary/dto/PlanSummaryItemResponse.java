package com.emre.meyvetakipsistemi.plansummary.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/*
  Bir planın tek bir ürünü için İhtiyaç/Alım/Toplama/Kabul miktar
  karşılaştırmasını taşır.

  needPurchaseDifference/purchaseCollectionDifference/collectionAcceptanceDifference/
  needAcceptanceDifference: negatif değer eksik miktarı, pozitif değer fazla
  miktarı belirtir. İlgili aşama henüz gerçekleşmediyse (örn. henüz alım
  yapılmadıysa) null'dır — sıfır olarak YORUMLANMAMALIDIR.
*/
@Getter
@AllArgsConstructor
public class PlanSummaryItemResponse {

    private Long fruitId;
    private String fruitName;
    private FruitUnit unit;

    private Double requiredQuantity;
    private Double purchasedQuantity;
    private Double collectedQuantity;
    private Double acceptedQuantity;

    private Double needPurchaseDifference;
    private Double purchaseCollectionDifference;
    private Double collectionAcceptanceDifference;
    private Double needAcceptanceDifference;

    // Bu ürün için tespit edilen miktar farkları / eksik aşama bilgileri (Türkçe, insan tarafından okunabilir).
    private List<String> issues;

    private boolean consistent;
}