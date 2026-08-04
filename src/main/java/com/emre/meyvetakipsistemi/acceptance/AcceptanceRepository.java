package com.emre.meyvetakipsistemi.acceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AcceptanceRepository extends JpaRepository<Acceptance, Long> {
    // Plan sonuç özeti (PlanSummaryService) için bir plana ait tüm mal kabul kayıtlarını bulur.
    List<Acceptance> findByPlanId(Long planId);
}
