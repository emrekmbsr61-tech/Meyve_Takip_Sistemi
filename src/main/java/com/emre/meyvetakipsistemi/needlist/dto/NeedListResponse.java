package com.emre.meyvetakipsistemi.needlist.dto;

import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// Backend'den frontend'e dönecek ihtiyaç listesi bilgisidir.
@Getter
@AllArgsConstructor
public class NeedListResponse {

    private Long id;
    private Long planId;

    private Long fruitId;
    private String fruitName;

    private Double requiredQuantity;

    private Long createdBy;
    private String createdByName;

    private LocalDateTime createdDate;
    private String notes;
    private NeedListStatus status;
}