package com.emre.meyvetakipsistemi.purchase;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/*
 * PurchaseRepository, purchases tablosu ile veritabanı işlemlerini yapar.
 */
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    List<Purchase> findByPlanId(Long planId);

    // Aynı plan + aynı meyve için ikinci bir alım kaydı oluşturulmasını
    // service katmanında engellemek için kullanılır (tekrar kayıt kontrolü).
    boolean existsByPlanIdAndFruitId(Long planId, Long fruitId);
}
