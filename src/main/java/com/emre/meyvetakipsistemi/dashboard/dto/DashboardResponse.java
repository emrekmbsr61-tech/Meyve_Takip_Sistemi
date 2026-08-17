package com.emre.meyvetakipsistemi.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/*
  Ana ekranda gösterilecek özet istatistikleri taşır.
  Tek bir istekle (GET /api/dashboard) hepsi birden döner.
*/
@Getter
@AllArgsConstructor
public class DashboardResponse {

    // Sistemde kayıtlı toplam (aktif) ürün sayısı.
    private long totalFruitCount;

    // Bugün yapılan alımların toplam tutarı (TL).
    private BigDecimal todayPurchaseTotal;

    // Son 7 günde yapılan alımların toplam tutarı (TL).
    private BigDecimal lastSevenDaysPurchaseTotal;

    // Henüz mal kabulü tamamlanmamış (devam eden) plan sayısı.
    private long activePlanCount;

    // Tamamlanmamış ve süresi henüz geçmemiş görev sayısı.
    private long activeTaskCount;

    // Süresi geçtiği halde tamamlanmamış görev sayısı.
    private long overdueTaskCount;

    // Tespit edilmiş kayıp/hırsızlık şüphesi (CRITICAL) sayısı.
    private long criticalIssueCount;

    // Dikkat gerektiren fark (WARNING/ERROR) sayısı.
    private long warningIssueCount;

    // En son tespit edilen tutarsızlıklar (en fazla 5 tane).
    private List<DashboardIssueResponse> recentIssues;
}
