package com.emre.meyvetakipsistemi.pricehistory;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

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

    /*
      Alim fiyati gecmisi. YALNIZCA mudur ve yonetici gorebilir.

      Sartname kurali: sofor alim fiyatini KESINLIKLE goremez. Bu uc korumasiz
      birakildiginda, giris yapmis herhangi bir sofor adresi dogrudan cagirip
      fiyatlari okuyabiliyordu - bagimsiz sayim ilkesi bozuluyordu.
    */
    @PreAuthorize("hasAnyRole('MAGAZA_MUDURU','ADMIN')")
    @GetMapping("/{fruitId}")
    public List<?> getRecentPrices(@PathVariable Long fruitId) {
        return priceHistoryService.getRecentPrices(fruitId);
    }
}
