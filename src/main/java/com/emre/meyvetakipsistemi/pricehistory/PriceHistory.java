package com.emre.meyvetakipsistemi.pricehistory;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/*
  PriceHistory entity'si, bir meyve için müdürün alım sırasında girdiği
  satış fiyatının (salesPrice) zaman içindeki geçmişini tutar.
*/
@Entity
@Table(name = "price_history")
@Getter
@Setter
public class PriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long fruitId;

    private BigDecimal price;

    private LocalDateTime date = LocalDateTime.now();
}
