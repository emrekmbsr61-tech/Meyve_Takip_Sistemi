package com.emre.meyvetakipsistemi.acceptance.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  "Tamamlanan İşlemler" ekranında gösterilen tek bir satırdır — bir mal kabul
  işlemindeki TEK bir ürünü temsil eder (bir Acceptance başlığının birden
  fazla AcceptanceItem'ı olabileceği için liste ürün bazında düzleştirilir).
*/
@Getter
@AllArgsConstructor
public class CompletedAcceptanceItemResponse {

    private Long acceptanceId;

    private Long planId;

    private String storeName;

    private String fruitName;

    private FruitUnit fruitUnit;

    private Double acceptedQuantity;

    private Double rejectedQuantity;

    private Boolean damaged;

    private String rejectionReason;

    private LocalDateTime createdAt;

    // Mal kabulü kimin yaptığı (ADMIN'in genel listesinde gerekli, kendi
    // listesini gören mağaza personeli için de bilgi amaçlı gösterilebilir).
    private String receivedByName;
}