package com.emre.meyvetakipsistemi.dashboard;

import com.emre.meyvetakipsistemi.auditlog.AuditLog;
import com.emre.meyvetakipsistemi.auditlog.AuditLogRepository;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import com.emre.meyvetakipsistemi.dashboard.dto.DashboardIssueResponse;
import com.emre.meyvetakipsistemi.dashboard.dto.DashboardResponse;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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

    private final FruitRepository fruitRepository;
    private final PurchaseRepository purchaseRepository;
    private final NeedListRepository needListRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuditLogRepository auditLogRepository;

    public DashboardService(
            FruitRepository fruitRepository,
            PurchaseRepository purchaseRepository,
            NeedListRepository needListRepository,
            TaskAssignmentRepository taskAssignmentRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.fruitRepository = fruitRepository;
        this.purchaseRepository = purchaseRepository;
        this.needListRepository = needListRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.auditLogRepository = auditLogRepository;
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

        List<AuditLog> issues = auditLogRepository.findByStatusInOrderByCreatedAtDesc(
                List.of(AuditStatus.WARNING, AuditStatus.ERROR, AuditStatus.CRITICAL)
        );

        long criticalCount = issues.stream()
                .filter(log -> log.getStatus() == AuditStatus.CRITICAL)
                .count();

        List<DashboardIssueResponse> recentIssues = issues.stream()
                .limit(8)
                .map(log -> new DashboardIssueResponse(
                        log.getPlanId(),
                        log.getStatus(),
                        log.getDescription(),
                        log.getDetails(),
                        log.getCreatedAt()
                ))
                .toList();

        return new DashboardResponse(
                fruitRepository.count(),
                todayTotal,
                weekTotal,
                activePlanIds.size(),
                activeTasks,
                overdueTasks,
                criticalCount,
                issues.size() - criticalCount,
                recentIssues
        );
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
