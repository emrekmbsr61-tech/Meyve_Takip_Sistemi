package com.emre.meyvetakipsistemi.deliveryplan;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/*

  DeliveryPlan entity'si sistemdeki ana teslimat / operasyon planını temsil eder.

*/
@Entity
@Table(name = "delivery_plans")
@Getter
@Setter
public class DeliveryPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // ID değeri veritabanı tarafından otomatik üretilir.
    private Long id;

    private String storeId; // Planın hangi mağaza / şube için oluşturulduğunu belirtir.

    @Enumerated(EnumType.STRING) // Plan durumu veritabanına CREATED, IN_PROGRESS gibi yazı olarak kaydedilir.
    private PlanStatus planStatus = PlanStatus.CREATED;

    private LocalDateTime createdDate = LocalDateTime.now();

    private LocalDateTime completedDate;

    private String generalNotes;
}