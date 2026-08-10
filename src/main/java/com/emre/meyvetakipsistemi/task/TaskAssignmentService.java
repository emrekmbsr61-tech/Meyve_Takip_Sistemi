package com.emre.meyvetakipsistemi.task;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/*
  Şoförün görevlerini okur ve TESLİMAT görevi tamamlandığında bir sonraki
  aşamayı (KABUL görevi ataması) tetikler.

  Bu metodun görevi: GET /api/tasks isteğini karşılayan getTasks() yalnızca
  OKUMA yapar, hiçbir zaman yeni görev oluşturmaz. Yeni görev oluşturma işlemi
  her zaman "bir aşama tamamlandığında" tetiklenir ve o aşamayı tamamlayan
  servisin içinde yapılır — PurchaseService.completeAlimTaskAndAssignToplama
  (ALIM tamamlanınca TOPLAMA/Alım Görevi atar), CollectionService
  .completeToplamaAndAssignTeslimat (TOPLAMA tamamlanınca TESLİMAT atar) ve
  burada completeDelivery (TESLİMAT tamamlanınca KABUL atar) hep aynı deseni
  izler.
*/
@Service
public class TaskAssignmentService {

    // KABUL görevi için süre standardı. PurchaseService/CollectionService'teki
    // TASK_DEADLINE_HOURS ile aynı geçici varsayımdır.
    private static final int TASK_DEADLINE_HOURS = 4;

    private final TaskAssignmentRepository taskRepository;
    private final NeedListRepository needListRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public TaskAssignmentService(
            TaskAssignmentRepository taskRepository,
            NeedListRepository needListRepository,
            UserRepository userRepository,
            AuditLogService auditLogService
    ) {
        this.taskRepository = taskRepository;
        this.needListRepository = needListRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    // Bu metodun görevi: Kullanıcıya atanmış mevcut görevleri okumak. Yeni görev oluşturmaz.
    public List<TaskAssignment> getTasks(Long userId) {
        return taskRepository.findByAssignedUserIdOrderByDueDateAsc(userId);
    }

    // Bu metodun görevi: Bir görevi "devam ediyor" durumuna çekmek (şu an frontend'de kullanılmıyor,
    // dokunulmadı).
    public TaskAssignment start(Long id) {
        TaskAssignment task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Görev bulunamadı."));
        task.setStatus(TaskStatus.IN_PROGRESS);
        return taskRepository.save(task);
    }

    /*
      Bu metodun görevi: Şoförün "Teslimatı Tamamla" butonuna basmasını karşılamak.
      1) Görevin gerçekten bu şoföre atanmış bir TESLİMAT görevi olduğunu doğrular.
      2) Zaten tamamlanmışsa hata verir (çift tamamlamayı engeller).
      3) Görevi COMPLETED yapar.
      4) Aynı plan için henüz bir KABUL (ACCEPTANCE) görevi yoksa, planı oluşturan
         MAGAZA_PERSONELI kullanıcısına yeni bir KABUL görevi atar — Acceptance/Mal
         Kabul akışının kendisi (AcceptanceService) hiç değişmedi, sadece bu görevin
         NE ZAMAN oluşturulacağı (artık TESLİMAT tamamlanınca) değişti.
    */
    @Transactional
    public TaskAssignment completeDelivery(Long taskId, Long driverId) {
        User driver = requireDriver(driverId);
        TaskAssignment teslimatTask = requireOwnTask(taskId, driver, TaskType.TESLIMAT);

        if (teslimatTask.getStatus() == TaskStatus.COMPLETED) {
            throw new RuntimeException("Bu teslimat zaten tamamlanmış");
        }

        teslimatTask.setStatus(TaskStatus.COMPLETED);
        TaskAssignment savedTeslimatTask = taskRepository.save(teslimatTask);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.TASK_COMPLETED,
                "TaskAssignment",
                savedTeslimatTask.getId(),
                "Plan #" + savedTeslimatTask.getPlanId() + " için TESLİMAT görevi tamamlandı."
        );

        assignKabulIfNeeded(savedTeslimatTask.getPlanId(), driver);

        return savedTeslimatTask;
    }

    /*
      Bu metodun görevi: Aynı plan için daha önce oluşturulmuş bir KABUL görevi
      yoksa, planı oluşturan MAGAZA_PERSONELI kullanıcısına yeni bir KABUL görevi
      atamak. CollectionService.completeToplamaAndAssignKabul'da yer alan mantığın
      buraya taşınmış hâlidir (bkz. sınıf başındaki açıklama).
    */
    private void assignKabulIfNeeded(Long planId, User driver) {
        boolean kabulTaskExists = taskRepository
                .findByPlanIdAndTaskType(planId, TaskType.ACCEPTANCE)
                .isPresent();

        if (kabulTaskExists) {
            return;
        }

        User planOwner = resolvePlanOwner(planId);

        TaskAssignment kabulTask = new TaskAssignment();
        kabulTask.setPlanId(planId);
        kabulTask.setAssignedUserId(planOwner.getId());
        kabulTask.setAssignedAt(LocalDateTime.now());
        kabulTask.setDueDate(LocalDateTime.now().plusHours(TASK_DEADLINE_HOURS));
        kabulTask.setTaskType(TaskType.ACCEPTANCE);
        kabulTask.setStatus(TaskStatus.PENDING);

        TaskAssignment savedTask = taskRepository.save(kabulTask);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.TASK_ASSIGNED,
                "TaskAssignment",
                savedTask.getId(),
                "Plan #" + planId + " için " + planOwner.getFullName() + " kullanıcısına kabul görevi atandı."
        );
    }

    /*
      Bu metodun görevi: KABUL görevinin kime atanacağını belirlemek. Aynı plana
      ait tüm NeedList kayıtlarının createdBy değeri aynı olmalıdır (bir plan her
      zaman tek bir MAGAZA_PERSONELI tarafından oluşturulur). Farklı createdBy
      değerleri varsa (beklenmeyen/bozuk veri durumu) görev oluşturulmaz, anlaşılır
      bir hata fırlatılır.
    */
    private User resolvePlanOwner(Long planId) {
        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException(
                    "Bu plana ait ihtiyaç kaydı bulunamadığı için kabul görevi oluşturulamadı"
            );
        }

        Set<Long> createdByIds = needs.stream()
                .map(NeedList::getCreatedBy)
                .collect(Collectors.toSet());

        if (createdByIds.size() > 1) {
            throw new RuntimeException(
                    "Bu plana ait ihtiyaç kayıtları farklı kullanıcılara ait olduğu için kabul görevi oluşturulamadı"
            );
        }

        Long ownerId = createdByIds.iterator().next();

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException(
                        "İhtiyaç planını oluşturan kullanıcı bulunamadığı için kabul görevi oluşturulamadı"
                ));

        if (owner.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new RuntimeException(
                    "İhtiyaç planını oluşturan kullanıcının rolü mağaza personeli değil, kabul görevi oluşturulamadı"
            );
        }

        return owner;
    }

    // Bu metodun görevi: Çağıranın var olan ve SOFOR rolünde bir kullanıcı olduğunu doğrulamak.
    private User requireDriver(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.SOFOR) {
            throw new RuntimeException("Bu işlem için şoför yetkisi gereklidir");
        }

        return user;
    }

    // Bu metodun görevi: Görevin var olduğunu, beklenen türde olduğunu ve bu şoföre
    // atanmış olduğunu doğrulamak (başka bir şoförün görevine dokunmayı engeller).
    private TaskAssignment requireOwnTask(Long taskId, User driver, TaskType expectedType) {
        TaskAssignment task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Görev bulunamadı"));

        if (task.getTaskType() != expectedType) {
            throw new RuntimeException("Bu görev bir teslimat görevi değil");
        }

        if (!driver.getId().equals(task.getAssignedUserId())) {
            throw new RuntimeException("Bu görev size atanmamış");
        }

        return task;
    }
}