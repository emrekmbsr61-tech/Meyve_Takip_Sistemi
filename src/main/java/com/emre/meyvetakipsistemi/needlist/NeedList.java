package com.emre.meyvetakipsistemi.needlist;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;


@Table(name="need_list")
@Entity
@Getter
@Setter

public class NeedList {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long planId;
    private Long fruitId;
    private Double requiredQuantity;
    private Long createdBy;
    private LocalDateTime createdDate = LocalDateTime.now();
    private String notes;
    @Enumerated(EnumType.STRING)
    private  NeedListStatus status = NeedListStatus.CREATED;
}

