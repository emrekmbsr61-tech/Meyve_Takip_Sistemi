package com.emre.meyvetakipsistemi.needlist.dto;

import lombok.Getter;
import lombok.Setter;

// Frontend'den ihtiyaç listesi oluşturmak için gelen veriyi taşır.
@Getter
@Setter
public class NeedListRequest {

    // Plan id bilgisidir.
    private Long planId;

    // İhtiyaç istenen meyvenin id bilgisidir.
    private Long fruitId;

    // İstenen miktar bilgisidir.
    private Double requiredQuantity;

    // İhtiyacı oluşturan kullanıcının id bilgisidir.
    private Long createdBy;

    // İhtiyaç listesi ile ilgili not bilgisidir.
    private String notes;
}