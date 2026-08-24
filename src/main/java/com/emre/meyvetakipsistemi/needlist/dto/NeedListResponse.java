package com.emre.meyvetakipsistemi.needlist.dto;

import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// Backend'den frontend'e dönecek ihtiyaç listesi bilgisidir.
@Getter
@AllArgsConstructor
public class NeedListResponse {

    private Long id;
    private Long planId;

    // Planın ait olduğu mağazanın kimliği (DeliveryPlan.storeId üzerinden gelir; eski/legacy
    // kayıtlarda DeliveryPlan yoksa null olabilir).
    private String storeId;

    // Ekranda gösterilecek mağaza adı — backend tarafından çözülür (bkz. DeliveryPlanService.resolveStoreInfo).
    // Frontend bu alanı planId üzerinden TAHMİN ETMEZ, doğrudan gösterir.
    private String storeName;

    private Long fruitId;
    private String fruitName;
    private String fruitCode;
    private FruitUnit fruitUnit;

    private Double requiredQuantity;

    private Long createdBy;
    private String createdByName;

    private LocalDateTime createdDate;

    // Bu ÜRÜN satırına yazılmış not (her ürünün kendi notu).
    private String notes;

    /*
      Planın geneli için yazılmış not (DeliveryPlan.generalNotes).
      "Yeni İhtiyaç Planı" ekranındaki "Plan Notu" kutusuna yazılan metindir ve
      aynı plandaki tüm satırlarda aynı değeri taşır. Ürün notlarıyla
      karıştırılmamalıdır.
    */
    private String planNotes;

    private NeedListStatus status;

    // Bu ikisi yalnızca kayıt gerçekten güncellenmişse dolu gelir (AuditLog'dan türetilir).
    private String updatedByName;
    private LocalDateTime updatedDate;

    /*
      Bu kayıt hâlâ düzenlenebilir mi?

      Plan için ilk alım kaydı oluştuğu anda false olur: miktar değiştirilemez,
      ürün eklenemez, plan iptal edilemez (bkz. NeedListService.requirePlanNotPurchased).
      Frontend bu alana bakarak düzenle/sil butonlarını gizler; asıl engelleme
      yine backend'dedir.
    */
    private boolean editable;
}
