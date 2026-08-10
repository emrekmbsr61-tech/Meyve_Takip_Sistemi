package com.emre.meyvetakipsistemi.pricehistory;

import com.emre.meyvetakipsistemi.pricehistory.dto.PriceHistoryItemResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// Fiyat geçmişi kayıtlarının oluşturulmasını ve okunmasını yönetir.
@Service
public class PriceHistoryService {

    private final PriceHistoryRepository priceHistoryRepository;

    public PriceHistoryService(PriceHistoryRepository priceHistoryRepository) {
        this.priceHistoryRepository = priceHistoryRepository;
    }

    // Purchase kaydı oluşturulduğunda, müdürün girdiği alış fiyatını fiyat geçmişine kaydeder.
    public void recordPrice(Long fruitId, BigDecimal price) {
        PriceHistory priceHistory = new PriceHistory();
        priceHistory.setFruitId(fruitId);
        priceHistory.setPrice(price);
        priceHistory.setDate(LocalDateTime.now());

        priceHistoryRepository.save(priceHistory);
    }

    // Bir ürünün son 3 alış fiyatını döner; müdürün yeni alım için fiyat belirlemesine yardımcı olur.
    public List<PriceHistoryItemResponse> getRecentPrices(Long fruitId) {
        return priceHistoryRepository.findTop3ByFruitIdOrderByDateDesc(fruitId).stream()
                .map(item -> new PriceHistoryItemResponse(item.getPrice(), item.getDate()))
                .toList();
    }
}
