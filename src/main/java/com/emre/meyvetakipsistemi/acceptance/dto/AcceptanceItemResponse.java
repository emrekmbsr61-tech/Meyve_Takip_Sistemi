package com.emre.meyvetakipsistemi.acceptance.dto;

import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AcceptanceItemResponse {
    private Long id;
    private Long needListId;
    private Long fruitId;
    private String fruitName;
    private String fruitCode;
    private FruitUnit fruitUnit;
    private Double expectedQuantity;
    private Double acceptedQuantity;
    private Double rejectedQuantity;
    private Boolean damaged;
    private String rejectionReason;
}
