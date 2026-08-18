package com.emre.meyvetakipsistemi.deliveryplan.dto;

import com.emre.meyvetakipsistemi.deliveryplan.PlanStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  Bir teslimat planının dışarı açılan bilgileri.

  Not: Planın kendisi (DeliveryPlan) sistemin omurgasıdır - id'si planId olarak
  NeedList, Purchase, Collection ve Acceptance kayıtlarının hepsinde tekrar eder
  ve dört aşamayı birbirine bağlar (bkz. NeedListService.createNeedListPlan).
*/
@Getter
@AllArgsConstructor
public class DeliveryPlanResponse {

    private Long id;

    // Planın hangi mağaza/şube için oluşturulduğu.
    private String storeId;

    // CREATED, IN_PROGRESS, COMPLETED, COMPLETED_WITH_WARNING, CANCELLED
    private PlanStatus planStatus;

    private LocalDateTime createdDate;

    private LocalDateTime completedDate;

    // Personelin plan geneli için yazdığı not.
    private String generalNotes;
}
