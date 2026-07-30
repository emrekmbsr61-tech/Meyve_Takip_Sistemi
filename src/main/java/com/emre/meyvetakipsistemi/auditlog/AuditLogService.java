package com.emre.meyvetakipsistemi.auditlog;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

// Log kayıtlarının oluşturulmasını yönetir.
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // Yeni log kaydı oluşturur.
    public void createLog(
            Long userId,
            String userFullName,
            AuditActionType actionType,
            String entityType,
            Long entityId,
            String description
    ) {
        AuditLog auditLog = new AuditLog();

        auditLog.setUserId(userId);
        auditLog.setUserFullName(userFullName);
        auditLog.setActionType(actionType);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setDescription(description);

        auditLogRepository.save(auditLog);
    }

    // Tüm log kayıtlarını getirir.
    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }

    // Bir kaydın belirli bir işlem türü için en son log kaydını döner (yoksa boş döner).
    // Örn: bir NeedList satırının "son güncelleyen" bilgisini bulmak için kullanılır.
    public Optional<AuditLog> findLatestLog(String entityType, Long entityId, AuditActionType actionType) {
        return auditLogRepository.findFirstByEntityTypeAndEntityIdAndActionTypeOrderByCreatedAtDesc(
                entityType, entityId, actionType
        );
    }
}