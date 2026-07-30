package com.emre.meyvetakipsistemi.pricehistory;

import org.springframework.data.jpa.repository.JpaRepository;

/*
 * PriceHistoryRepository, price_history tablosu ile veritabanı işlemlerini yapar.
 */
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {
}
