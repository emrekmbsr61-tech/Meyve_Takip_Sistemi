package com.emre.meyvetakipsistemi.pricehistory;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Fiyat geçmişi kayıtlarının oluşturulmasını yönetir.
@Service
public class PriceHistoryService {

    private final PriceHistoryRepository priceHistoryRepository;

    public PriceHistoryService(PriceHistoryRepository priceHistoryRepository) {
        this.priceHistoryRepository = priceHistoryRepository;
    }

    // Purchase kaydı oluşturulduğunda, müdürün girdiği satış fiyatını fiyat geçmişine kaydeder.
    public void recordPrice(Long fruitId, BigDecimal price) {
        PriceHistory priceHistory = new PriceHistory();
        priceHistory.setFruitId(fruitId);
        priceHistory.setPrice(price);
        priceHistory.setDate(LocalDateTime.now());

        priceHistoryRepository.save(priceHistory);
    }
}
