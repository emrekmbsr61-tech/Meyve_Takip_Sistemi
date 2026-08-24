package com.emre.meyvetakipsistemi.task;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auth.CurrentUserService;
import com.emre.meyvetakipsistemi.exception.ResourceNotFoundException;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.task.dto.AssignableUserResponse;
import com.emre.meyvetakipsistemi.task.dto.CompletedTaskResponse;
import com.emre.meyvetakipsistemi.task.dto.CreateTaskRequest;
import com.emre.meyvetakipsistemi.task.dto.TaskAssignmentResponse;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.notification.NotificationService;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    private final TaskAssignmentRepository taskRepository;
    private final NeedListRepository needListRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;
    private final TaskDeadlineCalculator taskDeadlineCalculator;

    public TaskAssignmentService(
            TaskAssignmentRepository taskRepository,
            NeedListRepository needListRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            NotificationService notificationService,
            CurrentUserService currentUserService,
            TaskDeadlineCalculator taskDeadlineCalculator
    ) {
        this.taskRepository = taskRepository;
        this.needListRepository = needListRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
        this.taskDeadlineCalculator = taskDeadlineCalculator;
    }

    /*
      Bu metodun görevi: Kullanıcıya atanmış mevcut görevleri okumak. Yeni görev oluşturmaz.

      Sahiplik kuralı: Herkes yalnızca KENDİ görevlerini okuyabilir (ADMIN hepsini).
      Önceden userId doğrudan istekten alınıyordu; giriş yapmış herhangi biri
      adrese başkasının id'sini yazarak onun görevlerini okuyabiliyordu.
      Kimlik artık doğrulanmış JWT'den karşılaştırılır (bkz. CurrentUserService).
    */
    public List<TaskAssignmentResponse> getTasks(Long userId) {
        currentUserService.requireOwnerOrAdmin(
                userId,
                "Yalnızca kendi görevlerinizi görüntüleyebilirsiniz."
        );

        return taskRepository.findByAssignedUserIdOrderByDueDateAsc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Entity'yi dışarı açılabilecek hâle çevirir (entity'ler API'de doğrudan kullanılmaz).
    private TaskAssignmentResponse toResponse(TaskAssignment task) {
        return new TaskAssignmentResponse(
                task.getId(),
                task.getPlanId(),
                task.getAssignedUserId(),
                task.getAssignedAt(),
                task.getDueDate(),
                task.getTaskType(),
                task.getStatus(),
                task.getTitle()
        );
    }

    /*
      Bu metodun görevi: Müdürün ELLE bir personele görev atamasını sağlamak
      (örn. "Depo temizliği").

      Akış görevlerinden (ALIM/TOPLAMA/TESLIMAT/ACCEPTANCE) iki farkı vardır:
        - Bir ihtiyaç planına bağlı değildir, bu yüzden planId BOŞ bırakılır.
        - Ne yapılacağı sabit olmadığı için açıklama title alanında saklanır.

      Son teslim zamanı burada hesaplanır (şu an + istenen saat). Client'tan
      hazır tarih kabul edilmez; aksi halde geçmiş bir tarih gönderilip görev
      daha doğar doğmaz "gecikmiş" hale getirilebilirdi.
    */
    @Transactional
    public TaskAssignmentResponse createManualTask(CreateTaskRequest request) {
        User manager = requireManager(request.getManagerId());
        User assignee = requireAssignableUser(request.getAssignedUserId());

        TaskAssignment task = new TaskAssignment();
        // Bilerek atanmaz: bu görevin bir planı yoktur (bkz. TaskType.GENEL).
        task.setPlanId(null);
        task.setAssignedUserId(assignee.getId());
        // Görev tamamlandığında haber verilecek kişi: görevi atayan müdür.
        task.setAssignedBy(manager.getId());
        task.setTitle(request.getTitle().trim());
        task.setAssignedAt(LocalDateTime.now());
        task.setDueDate(LocalDateTime.now().plusHours(request.getDurationHours()));
        task.setTaskType(TaskType.GENEL);
        task.setStatus(TaskStatus.PENDING);

        TaskAssignment saved = taskRepository.save(task);

        auditLogService.createLog(
                manager.getId(),
                manager.getFullName(),
                AuditActionType.TASK_ASSIGNED,
                "TaskAssignment",
                saved.getId(),
                manager.getFullName() + ", " + assignee.getFullName() + " kullanıcısına \""
                        + saved.getTitle() + "\" görevini atadı."
        );

        // Personel o an giriş yapmışsa görev anında ekranına düşer.
        notificationService.notifyUser(
                assignee.getId(),
                "GOREV_ATANDI",
                "Yeni görev atandı: " + saved.getTitle()
        );

        return toResponse(saved);
    }

    /*
      Bu metodun görevi: Kendisine atanan GENEL görevi personelin "tamamlandı"
      olarak işaretlemesini sağlamak.

      Yalnızca GENEL görevler için çalışır. Akış görevleri (ALIM/TOPLAMA/
      TESLIMAT/ACCEPTANCE) buradan tamamlanamaz: onlar ancak asıl işin kaydı
      girilince (alım/toplama/teslimat/kabul yapılınca) kendi servislerinde
      tamamlanır. Aksi halde personel işi hiç yapmadan görevi kapatabilirdi.
    */
    @Transactional
    public TaskAssignmentResponse completeManualTask(Long taskId, Long userId) {
        TaskAssignment task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Görev bulunamadı"));

        if (task.getTaskType() != TaskType.GENEL) {
            throw new RuntimeException("Bu görev buradan tamamlanamaz");
        }

        // Görevi yalnızca sahibi (veya ADMIN) kapatabilir; kimlik token'dan okunur.
        currentUserService.requireOwnerOrAdmin(
                task.getAssignedUserId(),
                "Bu görev size atanmamış."
        );

        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new RuntimeException("Bu görev zaten tamamlanmış");
        }

        task.setStatus(TaskStatus.COMPLETED);
        // Tamamlanma anı kaydedilir: "Tamamlanan İşlemler" ekranı bunu gösterir
        // ve süresinde bitip bitmediği bu değerle karşılaştırılır.
        task.setCompletedAt(LocalDateTime.now());
        TaskAssignment saved = taskRepository.save(task);

        String assigneeName = userRepository.findById(task.getAssignedUserId())
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");

        auditLogService.createLog(
                task.getAssignedUserId(),
                assigneeName,
                AuditActionType.TASK_COMPLETED,
                "TaskAssignment",
                saved.getId(),
                assigneeName + ", \"" + saved.getTitle() + "\" görevini tamamladı."
        );

        /*
          Görevi atayan müdüre haber verilir; böylece işin bittiğini sormadan
          öğrenir. Eski kayıtlarda assignedBy boş olabileceği için kontrol edilir.
        */
        if (saved.getAssignedBy() != null) {
            notificationService.notifyUser(
                    saved.getAssignedBy(),
                    "GOREV_TAMAMLANDI",
                    assigneeName + ", \"" + saved.getTitle() + "\" görevini tamamladı."
            );
        }

        return toResponse(saved);
    }

    /*
      Bu metodun görevi: "Tamamlanan İşlemler" ekranı için, tamamlanmış serbest
      görevleri (GENEL) listelemek.

      Yetki ve kapsam:
        - MAGAZA_MUDURU: yalnızca KENDİ atadığı görevleri görür.
        - ADMIN: kim atamış olursa olsun hepsini görür (genel gözetim).
      Diğer roller bu listeye hiç erişemez; tamamlanmış işlerin denetimi
      yönetim işidir (AcceptanceService.getCompletedAcceptances ile aynı kural).
    */
    public List<CompletedTaskResponse> getCompletedManualTasks(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        List<TaskAssignment> tasks;

        if (user.getRole() == UserRole.ADMIN) {
            tasks = taskRepository.findByTaskTypeAndStatusOrderByCompletedAtDesc(
                    TaskType.GENEL, TaskStatus.COMPLETED);
        } else if (user.getRole() == UserRole.MAGAZA_MUDURU) {
            tasks = taskRepository.findByTaskTypeAndStatusAndAssignedByOrderByCompletedAtDesc(
                    TaskType.GENEL, TaskStatus.COMPLETED, user.getId());
        } else {
            throw new RuntimeException("Bu işlem için yönetici veya mağaza müdürü yetkisi gereklidir");
        }

        List<CompletedTaskResponse> result = new ArrayList<>();

        for (TaskAssignment task : tasks) {
            /*
              Görev süresinde mi bitti? Karşılaştırma burada yapılır ki kural tek
              yerde kalsın. Tarihlerden biri yoksa "geç kaldı" denmez.
            */
            boolean completedLate = task.getCompletedAt() != null
                    && task.getDueDate() != null
                    && task.getCompletedAt().isAfter(task.getDueDate());

            result.add(new CompletedTaskResponse(
                    task.getId(),
                    task.getTitle(),
                    userFullName(task.getAssignedUserId()),
                    userFullName(task.getAssignedBy()),
                    task.getDueDate(),
                    task.getCompletedAt(),
                    completedLate
            ));
        }

        return result;
    }

    // Kullanıcı id'sinden ad soyad bulur; kullanıcı silinmişse anlaşılır bir metin döner.
    private String userFullName(Long userId) {
        if (userId == null) {
            return "Bilinmeyen kullanıcı";
        }

        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");
    }

    /*
      Bu metodun görevi: Müdürün görev atayabileceği personelleri listelemek.

      Yalnızca operasyon personeli döner (mağaza personeli ve şoför). ADMIN ve
      diğer müdürler bilerek dışarıda bırakılır: bu ekran saha görevi atamak
      içindir, yöneticilere görev atamak için değil.

      Ayrıca yalnızca E-POSTASINI DOĞRULAMIŞ kullanıcılar listelenir. Doğrulama
      yapmamış bir hesap zaten giriş yapamaz (bkz. AuthService.login), dolayısıyla
      kendisine atanan görevi hiçbir zaman göremez. Önceden bu kişiler de listede
      çıkıyor ve müdür var olmayan birine görev atayabiliyordu.
    */
    public List<AssignableUserResponse> getAssignableUsers(Long managerId) {
        requireManager(managerId);

        List<AssignableUserResponse> result = new ArrayList<>();

        for (UserRole role : List.of(UserRole.MAGAZA_PERSONELI, UserRole.SOFOR)) {
            for (User user : userRepository.findByRoleAndIsVerifiedTrue(role)) {
                result.add(new AssignableUserResponse(
                        user.getId(),
                        user.getFullName(),
                        roleLabel(user.getRole())
                ));
            }
        }

        return result;
    }

    // Çağıranın var olan ve MAGAZA_MUDURU rolünde bir kullanıcı olduğunu doğrular.
    private User requireManager(Long managerId) {
        if (managerId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (manager.getRole() != UserRole.MAGAZA_MUDURU) {
            throw new RuntimeException("Bu işlem için mağaza müdürü yetkisi gereklidir");
        }

        return manager;
    }

    // Görev atanacak kişinin var olduğunu ve görev alabilecek bir rolde olduğunu doğrular.
    private User requireAssignableUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Görev atanacak kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_PERSONELI && user.getRole() != UserRole.SOFOR) {
            throw new RuntimeException("Yalnızca mağaza personeline veya şoföre görev atanabilir");
        }

        return user;
    }

    // Rol adını ekranda gösterilecek okunabilir metne çevirir.
    private String roleLabel(UserRole role) {
        return switch (role) {
            case MAGAZA_PERSONELI -> "Mağaza Personeli";
            case MAGAZA_MUDURU -> "Mağaza Müdürü";
            case SOFOR -> "Şoför";
            case ADMIN -> "Yönetici";
            case PENDING -> "Onay Bekliyor";
        };
    }

    /*
      Bu metodun görevi: Bir görevi "devam ediyor" durumuna çekmek.

      Sahiplik kuralı: Görev yalnızca KENDİSİNE atanan kişi (veya ADMIN)
      tarafından başlatılabilir. Kimlik doğrulanmış token'dan okunur; böylece
      kardeş metot completeDelivery ile aynı güvenlik seviyesine gelir.
    */
    public TaskAssignmentResponse start(Long id) {
        TaskAssignment task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Görev bulunamadı."));

        currentUserService.requireOwnerOrAdmin(
                task.getAssignedUserId(),
                "Bu görev size atanmamış."
        );

        task.setStatus(TaskStatus.IN_PROGRESS);
        return toResponse(taskRepository.save(task));
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
    public TaskAssignmentResponse completeDelivery(Long taskId, Long driverId) {
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

        return toResponse(savedTeslimatTask);
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
        // Süre, plandaki ürünlere göre hesaplanır (bozulabilir ürün varsa 2, yoksa 4 saat).
        kabulTask.setDueDate(taskDeadlineCalculator.calculateDueDate(planId));
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

        notificationService.notifyUser(
                planOwner.getId(),
                "KABUL_GOREVI_ATANDI",
                "Teslimat tamamlandı, mal kabul bekleniyor (Plan #" + planId + ")."
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