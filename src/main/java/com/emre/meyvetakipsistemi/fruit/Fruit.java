package com.emre.meyvetakipsistemi.fruit;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/*
 * Fruit entity'si sistemde takip edilecek meyveleri temsil eder.
 * NeedList, Purchase, Collection ve Acceptance işlemleri
 * hangi meyve için yapılıyorsa bu tablo ile ilişkilendirilecektir.
 */

@Entity
@Table(name= "fruits")
@Getter
@Setter

public class Fruit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)// ID değeri veritabanı tarafından otomatik üretilir.
    private Long id;

    private String name;

    private String code;

    @Enumerated(EnumType.STRING) // KG, ADET, KASA değerleri veritabanına yazı olarak kaydedilir.
    private FruitUnit unit;

    private String imagePath; // Meyve fotoğrafı

    private Boolean isActive = true; // Meyve sistemde aktif olarak kullanılabiliyor mu?

    private Boolean isPerishable = false; // Hızlı bozulan ürün mü?
}
