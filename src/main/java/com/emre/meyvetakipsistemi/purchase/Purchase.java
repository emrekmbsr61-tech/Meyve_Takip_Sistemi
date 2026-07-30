package com.emre.meyvetakipsistemi.purchase;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/*
  Purchase entity'si, MAGAZA_MUDURU'nün hal/tedarikçiden yaptığı alımı temsil eder.
  Projenin geri kalanıyla aynı stilde, ilişkiler JPA @ManyToOne yerine düz
  Long id alanlarıyla kurulur: planId, fruitId, supplierId, createdBy.

  uniqueConstraints: aynı plan içinde aynı meyve için ikinci bir alım kaydı
  oluşturulmasını veritabanı seviyesinde de engeller (bkz. PurchaseService'teki
  service-katmanı kontrolü ile birlikte çalışır).
*/
@Entity
@Table(
        name = "purchases",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_purchase_plan_fruit",
                columnNames = {"plan_id", "fruit_id"}
        )
)
@Getter
@Setter
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long planId;

    private Long fruitId;

    private Double purchasedQuantity;

    private BigDecimal unitPrice;

    // Yalnızca backend tarafından hesaplanır: purchasedQuantity * unitPrice.
    private BigDecimal totalPrice;

    private BigDecimal salesPrice;

    private Long supplierId;

    private LocalDateTime purchaseDate = LocalDateTime.now();

    private Long createdBy;

    private String notes;
}
