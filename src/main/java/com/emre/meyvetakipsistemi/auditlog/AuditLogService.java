package com.emre.meyvetakipsistemi.auditlog;

import com.emre.meyvetakipsistemi.auditlog.dto.AuditLogResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

// Log kayıtlarının oluşturulmasını yönetir.
@Service
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /*
      Yeni log kaydı oluşturur (sade hali).
      Bu kısa imza, sistemin "normal akış" kayıtları içindir: status otomatik
      olarak SUCCESS kabul edilir, planId ve details boş bırakılır. Bir olayın
      önem derecesi veya sayısal ayrıntısı varsa aşağıdaki uzun imza kullanılır.
    */
    public void createLog(
            Long userId,
            String userFullName,
            AuditActionType actionType,
            String entityType,
            Long entityId,
            String description
    ) {
        createLog(userId, userFullName, actionType, entityType, entityId, description,
                null, AuditStatus.SUCCESS, null);
    }

    /*
      Yeni log kaydı oluşturur (tam hali).
      planId  : kayıt hangi plana ait (yoksa null).
      status  : olayın önem derecesi (bkz. AuditStatus).
      details : ek bilgi, JSON metni olarak (ör. miktar farkları). Yoksa null.
    */
    public void createLog(
            Long userId,
            String userFullName,
            AuditActionType actionType,
            String entityType,
            Long entityId,
            String description,
            Long planId,
            AuditStatus status,
            String details
    ) {
        AuditLog auditLog = new AuditLog();

        auditLog.setUserId(userId);
        auditLog.setUserFullName(userFullName);
        auditLog.setActionType(actionType);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setDescription(description);
        auditLog.setPlanId(planId);
        auditLog.setStatus(status == null ? AuditStatus.SUCCESS : status);
        auditLog.setDetails(details);

        auditLogRepository.save(auditLog);
    }

    /*
      Log kaydını AYRI bir veritabanı işlemi (transaction) içinde yazar.

      Neden gerekli: Denetim/bildirim amaçlı loglar, asıl iş işlemini (alım,
      toplama, mal kabul) ASLA bozmamalıdır. Aynı transaction içinde yazılan bir
      log kaydı başarısız olursa PostgreSQL tüm transaction'ı iptal eder ve
      kullanıcının gerçek kaydı da geri alınır. REQUIRES_NEW ile bu log kendi
      işlemi içinde yazılır; başarısız olursa yalnızca log kaybolur, asıl işlem
      etkilenmez.

      Bu davranış gerçek bir hatayla ortaya çıktı: AuditActionType'a yeni bir
      değer eklendiğinde veritabanındaki eski CHECK kısıtı bunu reddediyordu ve
      şoförün toplama kaydı bu yüzden tamamen başarısız oluyordu.
    */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createLogSafely(
            Long userId,
            String userFullName,
            AuditActionType actionType,
            String entityType,
            Long entityId,
            String description,
            Long planId,
            AuditStatus status,
            String details
    ) {
        try {
            createLog(userId, userFullName, actionType, entityType, entityId,
                    description, planId, status, details);
        } catch (Exception exception) {
            logger.error("Denetim kaydi yazilamadi ({}): {}",
                    actionType, exception.getClass().getSimpleName());
        }
    }

    /*
      Tüm log kayıtlarını, en yeniden en eskiye doğru döner.
      Entity doğrudan dışarı açılmaz; her satır AuditLogResponse'a çevrilir.
    */
    public List<AuditLogResponse> getAllLogs() {
        return auditLogRepository.findAll().stream()
                .sorted(Comparator.comparing(AuditLog::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getUserId(),
                log.getUserFullName(),
                log.getActionType(),
                log.getEntityType(),
                log.getEntityId(),
                log.getPlanId(),
                log.getStatus(),
                log.getDetails(),
                log.getDescription(),
                log.getCreatedAt()
        );
    }

    // Bir kaydın belirli bir işlem türü için en son log kaydını döner (yoksa boş döner).
    // Örn: bir NeedList satırının "son güncelleyen" bilgisini bulmak için kullanılır.
    public Optional<AuditLog> findLatestLog(String entityType, Long entityId, AuditActionType actionType) {
        return auditLogRepository.findFirstByEntityTypeAndEntityIdAndActionTypeOrderByCreatedAtDesc(
                entityType, entityId, actionType
        );
    }
}