package com.emre.meyvetakipsistemi.collection.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// Toplama kaydı başarıyla tamamlandığında frontend'e dönen özet bilgidir.
@Getter
@AllArgsConstructor
public class CollectionResultResponse {

    private Long planId;

    private int collectedItemCount;

    private String message;
}