package com.emre.meyvetakipsistemi.acceptance.dto;
import lombok.Getter;
import lombok.Setter;
@Getter @Setter
public class AcceptanceItemRequest { private Long needListId; private Long fruitId; private Double expectedQuantity; private Double acceptedQuantity; private Double rejectedQuantity; private Boolean damaged; private String rejectionReason; }
