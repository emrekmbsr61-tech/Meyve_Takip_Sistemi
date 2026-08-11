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
       Kabul ekranındaki asıl referans VE doğrulama üst sınırı budur (bkz.
       AcceptanceService.create()) — şoför daha fazla getirse bile personel
       en fazla bu kadarını kabul/red olarak işleyebilir.

    2) deliveredQuantity -> Collection.collectedQuantity
       Şoförün gerçekten topladığı ve mağazaya TESLİM ETTİĞİ miktar.
       Yalnızca BİLGİ/karşılaştırma amaçlıdır; doğrulamada sınır olarak
       KULLANILMAZ. expectedQuantity'den farklıysa ekranda "fazla/eksik
       geldi" notu göstermek için kullanılır.

    3) Mağaza personelinin girdiği "Kabul edilen" / "Reddedilen" miktarlar
       bu DTO'da YOKTUR — henüz kullanıcı tarafından girilecek değerlerdir.

  Örnek: İhtiyaç 20 KG, şoför 25 KG topladıysa: expectedQuantity=20,
  deliveredQuantity=25. Personel en fazla 20 KG'ı kabul+red olarak
  işleyebilir; 5 KG'lık fazlalık ekranda uyarı olarak görünür.
*/
@Getter
@AllArgsConstructor
public class AcceptanceChecklistItemResponse {

    private Long needListId;

    private Long fruitId;

    private String fruitName;

    private FruitUnit fruitUnit;

    // "Beklenen" — doğrulamanın gerçek üst sınırı (İhtiyaç).
    private Double expectedQuantity;

    // "Teslim Edilen" — yalnızca bilgi amaçlı (Toplama).
    private Double deliveredQuantity;
}
