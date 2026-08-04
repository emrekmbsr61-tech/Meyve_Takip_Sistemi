package com.emre.meyvetakipsistemi.acceptance;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
/*
  planId: AcceptanceItem'ın kendisi bir Acceptance (header) kaydına bağlıdır
  (acceptanceId), ama aynı planId + fruitId için ikinci bir kayıt oluşturulmasını
  Purchase/Collection'daki gibi tek tabloda UNIQUE constraint ile engelleyebilmek
  için planId burada da (Acceptance.planId ile aynı değer) tutulur — bkz.
  AcceptanceService.create() ve uk_acceptance_items_plan_fruit constraint'i.
*/
@Entity
@Table(
        name = "acceptance_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_acceptance_items_plan_fruit",
                columnNames = {"plan_id", "fruit_id"}
        )
)
@Getter @Setter
public class AcceptanceItem {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 private Long acceptanceId; private Long planId; private Long needListId; private Long fruitId; private Double expectedQuantity; private Double acceptedQuantity; private Double rejectedQuantity; private Boolean damaged; private String rejectionReason;
}
