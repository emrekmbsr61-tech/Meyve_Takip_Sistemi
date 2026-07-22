package com.emre.meyvetakipsistemi.auditlog;

import org.springframework.stereotype.Service;

import java.util.List;

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
}