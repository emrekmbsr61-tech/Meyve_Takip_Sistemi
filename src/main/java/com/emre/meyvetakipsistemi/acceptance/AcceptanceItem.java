package com.emre.meyvetakipsistemi.acceptance;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name = "acceptance_items") @Getter @Setter
public class AcceptanceItem {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 private Long acceptanceId; private Long needListId; private Long fruitId; private Double expectedQuantity; private Double acceptedQuantity; private Double rejectedQuantity; private Boolean damaged; private String rejectionReason;
}
