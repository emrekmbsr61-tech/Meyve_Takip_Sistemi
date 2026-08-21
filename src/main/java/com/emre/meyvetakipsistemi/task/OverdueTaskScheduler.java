package com.emre.meyvetakipsistemi.task;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import com.emre.meyvetakipsistemi.notification.NotificationService;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/*
  Arka planda kendi kendine çalışan otomatik denetimdir (Cron Job).

  Görevi: son teslim zamanı (dueDate) geçtiği halde hâlâ tamamlanmamış
  görevleri bulup durumlarını OVERDUE yapmak, AuditLog'a WARNING kaydı
  düşmek ve sorumlu personele anlık bildirim göndermek.

  Bu sınıfı hiçbir yerden çağırmıyoruz; Spring, @Scheduled sayesinde
  belirlenen aralıkta kendisi çalıştırır (bkz. MeyveTakipSistemiApplication
  üzerindeki @EnableScheduling).
*/
@Component
public class OverdueTaskScheduler {

    private static final Logger logger = LoggerFactory.getLogger(OverdueTaskScheduler.class);

    // Kontrolün çalışma sıklığı (milisaniye): 5 dakika.
    private static final long CHECK_INTERVAL_MS = 5 * 60 * 1000L;

    // Uygulama açılır açılmaz kontrol etmemek için ilk bekleme süresi: 1 dakika.
    private static final long INITIAL_DELAY_MS = 60 * 1000L;

    // Henüz tamamlanmamış sayılan durumlar; yalnızca bunlar OVERDUE olabilir.
    private static final List<TaskStatus> OPEN_STATUSES =
            List.of(TaskStatus.PENDING, TaskStatus.IN_PROGRESS);

    private final TaskAssignmentRepository taskAssignmentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public OverdueTaskScheduler(
            TaskAssignmentRepository taskAssignmentRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            NotificationService notificationService
    ) {
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    /*
      Not: Bu metodun ÜZERİNDE bilinçli olarak @Transactional YOKTUR.
      Görevler tek tek, birbirinden bağımsız işlenir; biri hata verirse
      diğerleri yine de işaretlenir. Tümü tek bir transaction içinde olsaydı
      tek bir hatalı kayıt yüzünden o turda HİÇBİR görev işaretlenmezdi
      (test sırasında tam olarak bu yaşandı).
    */
    @Scheduled(fixedRate = CHECK_INTERVAL_MS, initialDelay = INITIAL_DELAY_MS)
    public void markOverdueTasks() {
        LocalDateTime now = LocalDateTime.now();

        List<TaskAssignment> lateTasks =
                taskAssignmentRepository.findByStatusInAndDueDateBefore(OPEN_STATUSES, now);

        for (TaskAssignment task : lateTasks) {
            try {
                markSingleTaskOverdue(task, now);
            } catch (Exception exception) {
                logger.error("Gorev #{} OVERDUE yapilamadi: {}",
                        task.getId(), exception.getClass().getSimpleName());
            }
        }
    }

    /*
      Tek bir görevi "gecikti" yapar, loglar ve sorumlusuna bildirir.

      Buraya @Transactional KONULMAZ: aynı sınıf içinden çağrılan bir metotta
      Spring'in transaction proxy'si devreye girmez, anotasyon sessizce etkisiz
      kalırdı. Zaten ayrı bir transaction'a ihtiyaç da yok:
        - repository.save() kendi başına bir transaction'dır,
        - log kaydı zaten ayrı transaction'da yazılır (createLogSafely).
    */
    private void markSingleTaskOverdue(TaskAssignment task, LocalDateTime now) {
        task.setStatus(TaskStatus.OVERDUE);
        taskAssignmentRepository.save(task);

        String assigneeName = userRepository.findById(task.getAssignedUserId())
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");

        String taskLabel = taskLabel(task);

        /*
          Müdürün elle atadığı GENEL görevlerin planı yoktur (planId null).
          Metne doğrudan eklenseydi kullanıcı "Plan #null" gibi anlamsız bir
          ifade görürdü; bu yüzden plan bilgisi yalnızca varsa yazılır.
        */
        String planPart = task.getPlanId() == null ? "" : " (Plan #" + task.getPlanId() + ")";

        auditLogService.createLogSafely(
                task.getAssignedUserId(),
                assigneeName,
                AuditActionType.SYSTEM_CHECK,
                "TaskAssignment",
                task.getId(),
                "SYSTEM_CHECK: " + assigneeName + " kullanıcısına atanan \"" + taskLabel
                        + "\" görevinin süresi aşıldı!" + planPart,
                task.getPlanId(),
                AuditStatus.WARNING,
                "{\"gorevTuru\":\"" + task.getTaskType().name() + "\","
                        + "\"sonTeslim\":\"" + task.getDueDate() + "\","
                        + "\"tespitZamani\":\"" + now + "\"}"
        );

        // Sorumlu personel o an giriş yapmışsa ekranına anlık uyarı düşer.
        notificationService.notifyUser(
                task.getAssignedUserId(),
                "GOREV_SURESI_ASILDI",
                "\"" + taskLabel + "\" görevinin süresi doldu." + planPart
        );
    }

    /*
      Görevin ekranda/logda görünecek adını üretir.
      GENEL görevlerde tür adı ("Görev") anlamsızdır; müdürün yazdığı açıklama
      (örn. "Depo temizliği") kullanılır.
    */
    private String taskLabel(TaskAssignment task) {
        if (task.getTaskType() == TaskType.GENEL
                && task.getTitle() != null && !task.getTitle().isBlank()) {
            return task.getTitle();
        }

        return taskTypeLabel(task.getTaskType());
    }

    // Görev türünü kullanıcıya gösterilen Türkçe adına çevirir.
    private String taskTypeLabel(TaskType taskType) {
        if (taskType == null) {
            return "Görev";
        }

        return switch (taskType) {
            case ALIM -> "Alım";
            case TOPLAMA -> "Alım (Toplama)";
            case TESLIMAT -> "Teslimat";
            case ACCEPTANCE -> "Mal Kabul";
            case GENEL -> "Görev";
        };
    }
}
