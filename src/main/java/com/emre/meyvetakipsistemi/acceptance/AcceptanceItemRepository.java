package com.emre.meyvetakipsistemi.acceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AcceptanceItemRepository extends JpaRepository<AcceptanceItem, Long> {
    List<AcceptanceItem> findByAcceptanceId(Long acceptanceId);

    // Aynı plan + aynı meyve için ikinci bir mal kabul kaydı oluşturulmasını
    // service katmanında engellemek için kullanılır (Purchase/Collection'daki
    // existsByPlanIdAndFruitId ile aynı desendir).
    boolean existsByPlanIdAndFruitId(Long planId, Long fruitId);
}
