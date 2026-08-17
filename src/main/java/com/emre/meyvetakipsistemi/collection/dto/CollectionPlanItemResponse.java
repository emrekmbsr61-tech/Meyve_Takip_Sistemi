package com.emre.meyvetakipsistemi.collection.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Şoförün toplama ekranında görebileceği, tek bir ürüne ait GÜVENLİ bilgiyi taşır.
  purchasedQuantity, unitPrice, totalPrice ve salesPrice KESİNLİKLE bu sınıfa
  eklenmemelidir (bkz. CollectionService.buildCollectionPlanItem). managerNote
  fiyat bilgisi taşımadığı için güvenlidir; müdürün alım sırasında girdiği notu
  şoföre iletmek için eklenmiştir.
*/
@Getter
@AllArgsConstructor
public class CollectionPlanItemResponse {

    private Long fruitId;

    private String fruitName;

    private FruitUnit fruitUnit;

    private String supplierCode;

    private String supplierName;

    // Müdürün bu ürün için Alım Yönetimi ekranında girdiği not (varsa).
    private String managerNote;
}