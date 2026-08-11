package com.emre.meyvetakipsistemi.plansummary.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
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

    // "Tamamlanan İşlemler" > Sonucu Gör ekranında kabul/red kırılımını göstermek için eklendi.
    private Double rejectedQuantity;

    // Aynı ekranda "gerekliyse alış/satış bilgileri" gösterebilmek için eklendi (Purchase'tan).
    private BigDecimal unitPrice;
    private BigDecimal salesPrice;

    private Double needPurchaseDifference;
    private Double purchaseCollectionDifference;
    private Double collectionAcceptanceDifference;
    private Double needAcceptanceDifference;

    /*
      Beklenen (İhtiyaç) ile Teslim edilen (Toplama) arasındaki fark
      (collectedQuantity - requiredQuantity). Pozitif = fazla teslimat,
      negatif = eksik teslimat, null = henüz toplama yapılmamış. Mal Kabul
      ekranında eskiden "fazla/eksik geldi" olarak gösterilen yorum, artık
      sadece burada (Sonucu Gör ekranında) gösterilir.
    */
    private Double deliveryDifference;

    // Mal Kabul sırasında girilen not (AcceptanceItem.rejectionReason); yoksa null.
    private String note;

    // Bu ürün için tespit edilen miktar farkları / eksik aşama bilgileri (Türkçe, insan tarafından okunabilir).
    private List<String> issues;

    private boolean consistent;
}