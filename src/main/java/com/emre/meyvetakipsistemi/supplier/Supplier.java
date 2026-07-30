package com.emre.meyvetakipsistemi.supplier;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/*
  Supplier entity'si, Purchase (Alım) işleminde meyvenin alındığı
  hal/tedarikçiyi temsil eder.
*/
@Entity
@Table(name = "suppliers")
@Getter
@Setter
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String supplierName;

    private String marketName;

    private String address;

    private String phone;

    private Boolean isActive = true;
}
