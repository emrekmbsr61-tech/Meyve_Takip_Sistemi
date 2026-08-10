package com.emre.meyvetakipsistemi.pricehistory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/*
 * PriceHistoryRepository, price_history tablosu ile veritabanı işlemlerini yapar.
 */
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {

    // Bir ürünün en son 3 alış fiyatını, en yeniden en eskiye getirir.
    // Eski kayıtlar silinmez; yalnızca ekranda gösterilecek son 3 tanesi sorgulanır.
    List<PriceHistory> findTop3ByFruitIdOrderByDateDesc(Long fruitId);
}
