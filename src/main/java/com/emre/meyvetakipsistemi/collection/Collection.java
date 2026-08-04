package com.emre.meyvetakipsistemi.collection;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/*
  Collection entity'si, ŞOFÖR'ün TOPLAMA görevi kapsamında topladığı meyve
  miktarını temsil eder. Şoför, MAGAZA_MUDURU'nün Purchase kaydındaki
  purchasedQuantity/unitPrice/salesPrice bilgilerini GÖRMEDEN kendi bağımsız
  sayımını girer; bu yüzden Collection, Purchase'dan tamamen ayrı ve hiçbir
  fiyat alanı içermeyen bir tablodur.

  uniqueConstraints: aynı plan içinde aynı meyve için ikinci bir toplama kaydı
  oluşturulmasını veritabanı seviyesinde de engeller (bkz. CollectionService'teki
  service-katmanı kontrolü ile birlikte çalışır) — Purchase entity'sindeki aynı
  desenle tutarlıdır.
*/
@Entity
@Table(
        name = "collections",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_collection_plan_fruit",
                columnNames = {"plan_id", "fruit_id"}
        )
)
@Getter
@Setter
public class Collection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long planId;

    private Long fruitId;

    private Double collectedQuantity;

    private LocalDateTime collectionDate = LocalDateTime.now();

    private Long createdBy;

    private String notes;
}