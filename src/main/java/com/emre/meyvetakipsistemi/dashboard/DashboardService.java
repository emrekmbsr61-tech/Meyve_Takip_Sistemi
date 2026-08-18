package com.emre.meyvetakipsistemi.dashboard;

import com.emre.meyvetakipsistemi.acceptance.Acceptance;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceRepository;
import com.emre.meyvetakipsistemi.dashboard.dto.DashboardIssueResponse;
import com.emre.meyvetakipsistemi.dashboard.dto.DashboardResponse;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.plansummary.PlanSummaryService;
import com.emre.meyvetakipsistemi.plansummary.dto.PlanSummaryItemResponse;
import com.emre.meyvetakipsistemi.plansummary.dto.PlanSummaryResponse;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/*
  Ana ekrandaki özet istatistikleri üretir.

  Not: Sayımlar burada findAll() + stream ile yapılıyor. Bu, staj projesindeki
  veri miktarı için fazlasıyla yeterli ve okuması kolay; veri büyürse aynı
  hesaplar repository'de @Query ile veritabanına taşınmalıdır.
*/
@Service
public class DashboardService {

    // En yeniden en eskiye kaç TAMAMLANMIŞ plan taranır (performans + "güncel" anlamı için sınırlanır).
    private static final int MAX_PLANS_TO_SCAN = 20;

    // Ekranda gösterilecek en fazla tutarsızlık kartı sayısı.
    private static final int MAX_ISSUES_SHOWN = 8;

    private final FruitRepository fruitRepository;
    private final PurchaseRepository purchaseRepository;
    private final NeedListRepository needListRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AcceptanceRepository acceptanceRepository;
    private final PlanSummaryService planSummaryService;

    public DashboardService(
            FruitRepository fruitRepository,
            PurchaseRepository purchaseRepository,
            NeedListRepository needListRepository,
            TaskAssignmentRepository taskAssignmentRepository,
            AcceptanceRepository acceptanceRepository,
            PlanSummaryService planSummaryService
    ) {
        this.fruitRepository = fruitRepository;
        this.purchaseRepository = purchaseRepository;
        this.needListRepository = needListRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.acceptanceRepository = acceptanceRepository;
        this.planSummaryService = planSummaryService;
    }

    public DashboardResponse getDashboard() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime sevenDaysAgo = startOfToday.minusDays(6);

        List<Purchase> purchases = purchaseRepository.findAll();

        BigDecimal todayTotal = sumTotalPrice(purchases, startOfToday);
        BigDecimal weekTotal = sumTotalPrice(purchases, sevenDaysAgo);

        // Mal kabulü tamamlanmamış (APPROVED olmayan) satırların planları "devam eden" sayılır.
        Set<Long> activePlanIds = needListRepository.findAll().stream()
                .filter(need -> need.getStatus() != NeedListStatus.APPROVED)
                .map(NeedList::getPlanId)
                .filter(planId -> planId != null)
                .collect(Collectors.toSet());

        List<TaskAssignment> tasks = taskAssignmentRepository.findAll();

        long activeTasks = tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.PENDING
                        || task.getStatus() == TaskStatus.IN_PROGRESS)
                .count();

        long overdueTasks = tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.OVERDUE)
                .count();

        List<DashboardIssueResponse> allIssues = findRecentIssues();

        long criticalCount = allIssues.stream().filter(DashboardIssueResponse::isLossDetected).count();
        long warningCount = allIssues.size() - criticalCount;

        List<DashboardIssueResponse> issuesToShow = allIssues.size() > MAX_ISSUES_SHOWN
                ? allIssues.subList(0, MAX_ISSUES_SHOWN)
                : allIssues;

        return new DashboardResponse(
                fruitRepository.count(),
                todayTotal,
                weekTotal,
                activePlanIds.size(),
                activeTasks,
                overdueTasks,
                criticalCount,
                warningCount,
                issuesToShow
        );
    }

    /*
      TAMAMLANMIŞ (mal kabulü bitmiş) planları en yeniden en eskiye tarar ve
      her plandaki tutarsız ürünleri TEK satır halinde toplar.

      "Tamamlanmış" tanımı: bir planın Acceptance kaydı varsa o plan
      tamamlanmıştır. Bu güvenlidir çünkü AcceptanceService.create() bir
      planın AÇIK ürünlerinin TAMAMINI tek seferde ister (kısmi gönderim
      reddedilir); yani bir plan için Acceptance kaydı oluştuysa o plandaki
      tüm ürünler o anda birlikte tamamlanmış demektir.

      Aynı planı sayısal olarak DÖRT AYRI bulgu yerine (İhtiyaç-Alım,
      Alım-Toplama, Toplama-Kabul, İhtiyaç-Kabul) TEK bulguda birleştirmek
      için PlanSummaryService.buildSummary kullanılır - bu servis zaten aynı
      dört sayıyı (ihtiyaç/alım/toplama/kabul) bir ürün için TEK satırda
      hesaplıyor (bkz. "Sonucu Gör" ekranı ve özet maili, aynı kaynağı kullanır).
    */
    private List<DashboardIssueResponse> findRecentIssues() {
        List<Acceptance> recentAcceptances = acceptanceRepository.findAllByOrderByCreatedAtDesc();

        // Aynı plana ait birden fazla kayıt olsa bile plan yalnızca BİR kez
        // işlenir; liste zaten en yeniden eskiye sıralı geldiği için
        // LinkedHashMap'teki sıra da en yeniden eskiye kalır.
        Map<Long, LocalDateTime> completedAtByPlan = new LinkedHashMap<>();

        for (Acceptance acceptance : recentAcceptances) {
            if (completedAtByPlan.size() >= MAX_PLANS_TO_SCAN) {
                break;
            }
            completedAtByPlan.putIfAbsent(acceptance.getPlanId(), acceptance.getCreatedAt());
        }

        List<DashboardIssueResponse> issues = new ArrayList<>();

        for (Map.Entry<Long, LocalDateTime> entry : completedAtByPlan.entrySet()) {
            /*
              Tek bir bozuk/eski plan yüzünden TÜM ana ekran çökmesin diye
              her plan ayrı ayrı korunur. Gerçek bir örnekle karşılaşıldı:
              eski bir plan (#9) NeedList satırları silinmiş ama Acceptance
              kaydı kalmış durumda kalmıştı; buildSummary bu durumda hata
              fırlatıyor - o TEK plan atlanır, geri kalanlar etkilenmez.
            */
            PlanSummaryResponse summary;

            try {
                summary = planSummaryService.buildSummary(entry.getKey());
            } catch (Exception exception) {
                continue;
            }

            for (PlanSummaryItemResponse item : summary.getItems()) {
                if (item.isConsistent()) {
                    continue;
                }

                issues.add(new DashboardIssueResponse(
                        entry.getKey(),
                        summary.getStoreName(),
                        item.getFruitName(),
                        item.getUnit(),
                        item.getRequiredQuantity(),
                        item.getPurchasedQuantity(),
                        item.getCollectedQuantity(),
                        item.getAcceptedQuantity(),
                        hasLoss(item),
                        entry.getValue()
                ));
            }
        }

        return issues;
    }

    // Dört aşamadan herhangi birinde miktar AZALDIYSA true (kayıp şüphesi).
    private boolean hasLoss(PlanSummaryItemResponse item) {
        return isNegative(item.getNeedPurchaseDifference())
                || isNegative(item.getPurchaseCollectionDifference())
                || isNegative(item.getCollectionAcceptanceDifference())
                || isNegative(item.getNeedAcceptanceDifference());
    }

    private boolean isNegative(Double value) {
        return value != null && value < 0;
    }

    // Belirtilen tarihten bugüne kadar yapılan alımların toplam tutarını hesaplar.
    private BigDecimal sumTotalPrice(List<Purchase> purchases, LocalDateTime since) {
        return purchases.stream()
                .filter(purchase -> purchase.getPurchaseDate() != null
                        && !purchase.getPurchaseDate().isBefore(since))
                .map(Purchase::getTotalPrice)
                .filter(total -> total != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
