package com.emre.meyvetakipsistemi.collection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/*
 * CollectionRepository, collections tablosu ile veritabanı işlemlerini yapar.
 */
public interface CollectionRepository extends JpaRepository<Collection, Long> {

    List<Collection> findByPlanId(Long planId);

    // Aynı plan + aynı meyve için ikinci bir toplama kaydı oluşturulmasını
    // service katmanında engellemek için kullanılır (tekrar kayıt kontrolü).
    boolean existsByPlanIdAndFruitId(Long planId, Long fruitId);
}