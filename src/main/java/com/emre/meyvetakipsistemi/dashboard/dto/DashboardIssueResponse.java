package com.emre.meyvetakipsistemi.dashboard.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  TAMAMLANMIŞ bir planın tek bir ürününe ait BÜTÜN hikayeyi (ihtiyaç -> alım ->
  toplama -> kabul) tek satırda taşır.

  Önceki tasarım: AuditLog'daki her aşama-karşılaştırması (İhtiyaç-Alım,
  Alım-Toplama, Toplama-Kabul, İhtiyaç-Kabul) ayrı bir "bulgu" olarak
  gösteriliyordu. Tek bir üründe uçtan uca kayıp varsa bu, aynı ürün için 4
  farklı karta bölünüyordu ve plan daha bitmeden (Toplama'dan hemen sonra)
  bile görünüyordu - kullanıcı için anlaşılmaz bir görünümdü.

  Yeni tasarım: yalnızca TAMAMLANMIŞ (mal kabulü bitmiş) planlar taranır ve
  bir ürünün dört sayısı BİRLİKTE, tek kartta gösterilir (bkz.
  DashboardService.findRecentIssues ve Dashboard/IssueCard.js). Hangi
  aşamada kayıp olduğu, kartın kendisinde sayılar arasındaki farktan
  görsel olarak anlaşılır - ayrıca teknik bir "aşama kodu" göndermeye
  gerek kalmaz.
*/
@Getter
@AllArgsConstructor
public class DashboardIssueResponse {

    private Long planId;

    private String storeName;

    private String fruitName;

    private FruitUnit unit;

    private Double requiredQuantity;

    private Double purchasedQuantity;

    private Double collectedQuantity;

    private Double acceptedQuantity;

    /*
      En az bir aşamada miktar AZALDIYSA true (kayıp şüphesi, kırmızı).
      Yalnızca fazlalık varsa false (kayıp değil, turuncu) - fazladan
      sipariş/toplama bir hırsızlık göstergesi değildir.
    */
    private boolean lossDetected;

    // Bu planın mal kabulünün tamamlandığı an; kartta "ne zaman" bilgisi için.
    private LocalDateTime completedAt;
}
