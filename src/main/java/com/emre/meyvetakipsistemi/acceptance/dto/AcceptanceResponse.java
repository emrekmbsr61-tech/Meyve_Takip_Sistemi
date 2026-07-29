package com.emre.meyvetakipsistemi.acceptance.dto;

import com.emre.meyvetakipsistemi.acceptance.AcceptanceStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class AcceptanceResponse {
    private Long id;
    private Long planId;
    private Long receivedBy;
    private LocalDateTime createdAt;
    private AcceptanceStatus status;
    private List<AcceptanceItemResponse> items;
}
