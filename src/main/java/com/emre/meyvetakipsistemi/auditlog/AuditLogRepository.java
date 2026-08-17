package com.emre.meyvetakipsistemi.auditlog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// AuditLog tablosu için veritabanı işlemlerini yapar.
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // Dashboard'daki "tutarsızlık uyarıları" için: belirli önem derecesindeki
    // kayıtları en yeniden eskiye doğru getirir (bkz. DashboardService).
    List<AuditLog> findByStatusInOrderByCreatedAtDesc(List<AuditStatus> statuses);

    // Bir kaydın (örn. bir NeedList satırının) belirli bir işlem türü için en son
    // log kaydını bulur. "Son güncelleyen" bilgisini AuditLog'dan güvenilir şekilde
    // türetmek için kullanılır (bkz. AuditLogService.findLatestLog).
    Optional<AuditLog> findFirstByEntityTypeAndEntityIdAndActionTypeOrderByCreatedAtDesc(
            String entityType, Long entityId, AuditActionType actionType
    );
}