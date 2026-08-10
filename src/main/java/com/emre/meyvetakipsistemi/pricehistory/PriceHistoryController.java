package com.emre.meyvetakipsistemi.pricehistory;

import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
  Alım ekranında müdüre "son 3 alış fiyatı" bilgisini sağlayan salt okunur
  endpoint'i karşılar. AuditLogController'daki GET /api/audit-logs ile aynı
  desende: fiyat bilgisi gizli değildir, ekstra bir rol kontrolü eklenmedi.
*/
@RestController
@RequestMapping("/api/price-history")
@CrossOrigin(origins = "*")
public class PriceHistoryController {

    private final PriceHistoryService priceHistoryService;

    public PriceHistoryController(PriceHistoryService priceHistoryService) {
        this.priceHistoryService = priceHistoryService;
    }

    @GetMapping("/{fruitId}")
    public List<?> getRecentPrices(@PathVariable Long fruitId) {
        return priceHistoryService.getRecentPrices(fruitId);
    }
}
