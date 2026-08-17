package com.emre.meyvetakipsistemi.acceptance.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Kabul (Acceptance) ekranında, kaydetmeden ÖNCE gösterilecek satırı taşır.
  İş kuralı (kullanıcıyla netleştirildi): mağaza yalnızca kendi İSTEDİĞİ kadarını
  "bekler". Üç ayrı miktar kavramı burada BİLİNÇLİ olarak birbirinden ayrı tutulur:

    1) expectedQuantity -> NeedList.requiredQuantity
       Mağaza personelinin İLK istediği miktar ("İhtiyaç" = "Beklenen").
       Kabul ekranında referans olarak gösterilir; kabul/red miktarları
       artık bu değerle sınırlanmaz (kullanıcıyla netleştirildi).

    2) deliveredQuantity -> Collection.collectedQuantity
       Şoförün gerçekten topladığı ve mağazaya TESLİM ETTİĞİ miktar.
       Ekranda AYRICA gösterilmez (kullanıcı istemedi), ama ileride
       "Tamamlanan İşlemler" gibi rapor ekranlarında kullanılabilsin diye
       DTO'da tutulmaya devam eder.

    3) driverNote -> Collection.notes
       Şoförün toplama sırasında bu ürün için yazdığı not; mağaza
       personelinin mal kabul sırasında görmesi için buraya taşınır.

    4) Mağaza personelinin girdiği "Kabul edilen" / "Reddedilen" miktarlar
       bu DTO'da YOKTUR — henüz kullanıcı tarafından girilecek değerlerdir.
*/
@Getter
@AllArgsConstructor
public class AcceptanceChecklistItemResponse {

    private Long needListId;

    private Long fruitId;

    private String fruitName;

    private FruitUnit fruitUnit;

    // "Beklenen" — mağazanın istediği miktar (İhtiyaç).
    private Double expectedQuantity;

    // "Teslim Edilen" — yalnızca bilgi amaçlı (Toplama).
    private Double deliveredQuantity;

    // Şoförün toplama sırasında bu ürün için girdiği not (varsa).
    private String driverNote;
}
