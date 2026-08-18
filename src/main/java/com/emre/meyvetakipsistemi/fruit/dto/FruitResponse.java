package com.emre.meyvetakipsistemi.fruit.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Bir meyvenin/sebzenin dışarı açılabilecek bilgilerini taşır.

  Neden var: Şartname, Entity sınıflarının doğrudan dışarı açılmamasını,
  frontend'e her zaman ayrı bir Response sınıfının dönmesini istiyor.
  Böylece veritabanı yapısı değiştiğinde API cevabı kendiliğinden değişmez;
  ne göndereceğimize burada bilinçli olarak karar veririz.
*/
@Getter
@AllArgsConstructor
public class FruitResponse {

    private Long id;

    private String name;

    private String code;

    // KG, ADET, KASA
    private FruitUnit unit;

    // Ürün görselinin adresi (ör. /fruits/elma.jpeg)
    private String imagePath;

    private Boolean isActive;

    // Hızlı bozulan ürün mü? Görev süresi hesabında kullanılır (2 saat / 4 saat).
    private Boolean isPerishable;

    // Alım ekranında satış fiyatının otomatik hesaplanmasında kullanılan kar yüzdesi.
    private Double profitMarginPercent;
}
