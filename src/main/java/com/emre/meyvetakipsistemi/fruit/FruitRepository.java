package com.emre.meyvetakipsistemi.fruit;

import org.springframework.data.jpa.repository.JpaRepository;

/*
  FruitRepository, fruits tablosu ile veritabanı işlemlerini yapar.
 */


public interface FruitRepository extends JpaRepository<Fruit,Long>{


}
