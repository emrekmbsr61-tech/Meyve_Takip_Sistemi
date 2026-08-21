package com.emre.meyvetakipsistemi.deliveryplan;

import com.emre.meyvetakipsistemi.acceptance.AcceptanceRepository;
import com.emre.meyvetakipsistemi.deliveryplan.dto.PlanProgressResponse;
import com.emre.meyvetakipsistemi.exception.ResourceNotFoundException;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import com.emre.meyvetakipsistemi.task.TaskType;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/*
  "Devam Eden İşlemler": henüz tamamlanmamış planların ŞU AN hangi aşamada
  beklediğini listeler. Müdürün "alımı yaptım, mal şimdi nerede?" sorusunun
  cevabıdır.

  PlanSummaryService ile karıştırılmamalı: orası BİTMİŞ bir planın miktar
  karşılaştırmasıdır (geçmiş). Burası devam eden planın konumudur (şu an).

  Hiçbir yeni tablo kullanılmaz; mevcut task_assignments kayıtları okunur.
*/
@Service
public class PlanProgressService {

    /*
      Planın izlediği sıra. Aşamanın kendisi bu listeden belirlenir: sırayla
      bakılır, TAMAMLANMAMIŞ ilk görev planın bulunduğu aşamadır.
    */
    private static final List<TaskType> FLOW = List.of(
            TaskType.ALIM,
            TaskType.TOPLAMA,
            TaskType.TESLIMAT,
            TaskType.ACCEPTANCE
    );

    private final DeliveryPlanRepository deliveryPlanRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final NeedListRepository needListRepository;
    private final AcceptanceRepository acceptanceRepository;
    private final UserRepository userRepository;

    public PlanProgressService(
            DeliveryPlanRepository deliveryPlanRepository,
            DeliveryPlanService deliveryPlanService,
            TaskAssignmentRepository taskAssignmentRepository,
            NeedListRepository needListRepository,
            AcceptanceRepository acceptanceRepository,
            UserRepository userRepository
    ) {
        this.deliveryPlanRepository = deliveryPlanRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.needListRepository = needListRepository;
        this.acceptanceRepository = acceptanceRepository;
        this.userRepository = userRepository;
    }

    public List<PlanProgressResponse> getInProgressPlans(Long userId) {
        requireManagerOrAdmin(userId);

        List<PlanProgressResponse> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (DeliveryPlan plan : deliveryPlanRepository.findAll()) {
            // İptal edilmiş planlar takip edilecek bir iş değildir.
            if (plan.getPlanStatus() == PlanStatus.CANCELLED) {
                continue;
            }

            // Mal kabulü yapılmış plan bitmiştir; artık "Tamamlanan İşlemler"e aittir.
            if (!acceptanceRepository.findByPlanId(plan.getId()).isEmpty()) {
                continue;
            }

            int itemCount = needListRepository.findByPlanId(plan.getId()).size();

            /*
              Ürünü kalmamış plan (ör. tüm ürünleri tek tek silinmiş eski kayıt)
              takip edilebilir bir iş değildir; ekranı kirletmemesi için atlanır.
            */
            if (itemCount == 0) {
                continue;
            }

            TaskAssignment currentTask = findCurrentTask(plan.getId());
            TaskType stage = currentTask != null ? currentTask.getTaskType() : TaskType.ALIM;

            boolean overdue = currentTask != null
                    && currentTask.getDueDate() != null
                    && currentTask.getStatus() != TaskStatus.COMPLETED
                    && currentTask.getDueDate().isBefore(now);

            result.add(new PlanProgressResponse(
                    plan.getId(),
                    deliveryPlanService.resolveStoreInfo(plan.getId()).storeName(),
                    itemCount,
                    stage,
                    stageLabel(stage, currentTask),
                    currentTask == null ? null : userFullName(currentTask.getAssignedUserId()),
                    currentTask == null ? null : currentTask.getDueDate(),
                    overdue,
                    plan.getCreatedDate()
            ));
        }

        // En yeni plan en üstte.
        result.sort(Comparator.comparing(PlanProgressResponse::getPlanId).reversed());

        return result;
    }

    /*
      Planın şu an beklediği görevi bulur: akış sırasına göre TAMAMLANMAMIŞ ilk görev.
      Hiç görev yoksa (ör. sistemde henüz müdür tanımlı değilken oluşturulmuş plan)
      null döner ve aşama "Alım bekleniyor" olarak gösterilir.
    */
    private TaskAssignment findCurrentTask(Long planId) {
        List<TaskAssignment> tasks = taskAssignmentRepository.findByPlanId(planId);

        for (TaskType type : FLOW) {
            Optional<TaskAssignment> match = tasks.stream()
                    .filter(task -> task.getTaskType() == type)
                    .findFirst();

            if (match.isEmpty()) {
                // Bu aşamanın görevi henüz oluşturulmamış: plan burada bekliyor.
                return null;
            }

            if (match.get().getStatus() != TaskStatus.COMPLETED) {
                return match.get();
            }
        }

        return null;
    }

    // Aşamayı, müdürün anlayacağı "mal şu an nerede" cümlesine çevirir.
    private String stageLabel(TaskType stage, TaskAssignment task) {
        if (task == null) {
            return "Alım bekleniyor";
        }

        return switch (stage) {
            case ALIM -> "Müdür alım yapacak";
            case TOPLAMA -> "Şoför halden toplayacak";
            case TESLIMAT -> "Şoför mağazaya götürüyor";
            case ACCEPTANCE -> "Personel mal kabul yapacak";
            case GENEL -> "Serbest görev";
        };
    }

    private String userFullName(Long userId) {
        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");
    }

    /*
      Bu ekranı yalnızca yönetim görür: içinde hangi personelin hangi işi
      geciktirdiği bilgisi vardır (AcceptanceService.getCompletedAcceptances
      ile aynı kural).
    */
    private void requireManagerOrAdmin(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.MAGAZA_MUDURU) {
            throw new RuntimeException("Bu işlem için yönetici veya mağaza müdürü yetkisi gereklidir");
        }
    }
}
