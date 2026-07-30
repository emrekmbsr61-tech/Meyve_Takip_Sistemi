package com.emre.meyvetakipsistemi.needlist.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

/*
  Yeni bir ihtiyaç planı (DeliveryPlan + NeedList satırları) oluşturma isteğini taşır.
  Dikkat: planId burada BİLİNÇLİ OLARAK yoktur — planId her zaman backend tarafından
  yeni bir DeliveryPlan kaydı oluşturularak üretilir, client'tan asla kabul edilmez.
*/
@Getter
@Setter
public class NeedListPlanRequest {

    private String storeId;

    private Long createdBy;

    private String generalNotes;

    private List<NeedListPlanItemRequest> items;
}
