package com.emre.meyvetakipsistemi.purchase;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/*
 * PurchaseRepository, purchases tablosu ile veritabanı işlemlerini yapar.
 */
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    List<Purchase> findByPlanId(Long planId);

    /*
      Bu plan için herhangi bir alım yapılmış mı?

      İhtiyaç kayıtlarının kilitlenmesinde kullanılır: müdür alımı yaptıktan
      sonra personel ihtiyaç miktarını değiştirirse, denetim yanlış sayıyla
      karşılaştırma yapar ve kayıp tespiti anlamını yitirir
      (bkz. NeedListService.requirePlanNotPurchased).
    */
    boolean existsByPlanId(Long planId);

    // Aynı plan + aynı meyve için ikinci bir alım kaydı oluşturulmasını
    // service katmanında engellemek için kullanılır (tekrar kayıt kontrolü).
    boolean existsByPlanIdAndFruitId(Long planId, Long fruitId);
}
