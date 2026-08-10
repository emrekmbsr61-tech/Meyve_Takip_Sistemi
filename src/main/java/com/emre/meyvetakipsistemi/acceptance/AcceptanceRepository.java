package com.emre.meyvetakipsistemi.acceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AcceptanceRepository extends JpaRepository<Acceptance, Long> {
    // Plan sonuç özeti (PlanSummaryService) için bir plana ait tüm mal kabul kayıtlarını bulur.
    List<Acceptance> findByPlanId(Long planId);

    // "Tamamlanan İşlemler" ekranında bir mağaza personelinin kendi geçmiş mal
    // kabullerini en yeniden en eskiye listelemek için kullanılır.
    List<Acceptance> findByReceivedByOrderByCreatedAtDesc(Long receivedBy);

    // "Tamamlanan İşlemler" ekranında ADMIN'in tüm kullanıcıların geçmiş mal
    // kabullerini görebilmesi için kullanılır (salt okunur genel izleme).
    List<Acceptance> findAllByOrderByCreatedAtDesc();
}