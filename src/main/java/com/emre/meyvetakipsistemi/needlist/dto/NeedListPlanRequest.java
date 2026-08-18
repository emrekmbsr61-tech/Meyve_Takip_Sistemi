package com.emre.meyvetakipsistemi.needlist.dto;

import jakarta.validation.constraints.NotNull;

import jakarta.validation.constraints.NotEmpty;

import jakarta.validation.constraints.NotBlank;

import jakarta.validation.Valid;

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

    @NotBlank(message = "Mağaza seçilmelidir")
    private String storeId;

    @NotNull(message = "Kullanıcı kimliği gereklidir")
    private Long createdBy;

    private String generalNotes;

    @NotEmpty(message = "En az bir ürün seçilmelidir")
    @Valid
    private List<NeedListPlanItemRequest> items;
}
