package com.emre.meyvetakipsistemi.task;

import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/*
  Bir görevin son teslim zamanını (deadline) hesaplayan TEK yerdir.

  Kural (şartname): standart süre 4 saattir; ancak plandaki ürünlerden EN AZ
  BİRİ hızlı bozulan (Fruit.isPerishable = true) ise süre 2 saate düşer.
  Bozulabilir ürün en kısa süreyi belirler, çünkü plandaki en hassas ürün
  bekleyebileceği süreyi tayin eder.

  Önceden bu süre dört ayrı serviste (NeedList/Purchase/Collection/
  TaskAssignment) birbirinden bağımsız "4" sabiti olarak yazılıydı ve
  isPerishable hiç okunmuyordu. Artık hepsi buraya sorar.
*/
@Service
public class TaskDeadlineCalculator {

    // Normal ürünler için standart görev süresi.
    private static final int STANDARD_HOURS = 4;

    // Hızlı bozulan ürün içeren planlar için kısaltılmış süre.
    private static final int PERISHABLE_HOURS = 2;

    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;

    public TaskDeadlineCalculator(
            NeedListRepository needListRepository,
            FruitRepository fruitRepository
    ) {
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
    }

    // Verilen plan için görevin bitmesi gereken zamanı döner.
    public LocalDateTime calculateDueDate(Long planId) {
        return LocalDateTime.now().plusHours(resolveHours(planId));
    }

    // Plandaki ürünlere bakarak kaç saat verileceğine karar verir.
    public int resolveHours(Long planId) {
        if (planId == null) {
            return STANDARD_HOURS;
        }

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        for (NeedList need : needs) {
            Fruit fruit = fruitRepository.findById(need.getFruitId()).orElse(null);

            if (fruit != null && Boolean.TRUE.equals(fruit.getIsPerishable())) {
                return PERISHABLE_HOURS;
            }
        }

        return STANDARD_HOURS;
    }
}
