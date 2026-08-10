package com.emre.meyvetakipsistemi.collection.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Teslimat Görevi ekranında gösterilen tek bir ürün satırıdır.
  collectedQuantity, şoförün TOPLAMA (Alım Görevi) aşamasında kendi kaydettiği
  miktardır — yani "şimdi mağazaya teslim edeceğim miktar" budur.
*/
@Getter
@AllArgsConstructor
public class DeliverySummaryItemResponse {

    private Long fruitId;

    private String fruitName;

    private FruitUnit fruitUnit;

    private Double collectedQuantity;
}