package com.emre.meyvetakipsistemi.auditlog;

import com.emre.meyvetakipsistemi.auditlog.dto.AuditLogResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Log kayıtlarını admin log ekranına açar.
@RestController
@RequestMapping("/api/audit-logs")
@CrossOrigin(origins = "http://localhost:8081")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /*
      Tüm log kayıtlarını getirir.
      Şartname gereği bu ekranı yalnızca ADMIN görebilir; rol, doğrulanmış
      JWT token'dan okunur (bkz. JwtAuthenticationFilter).
    */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<AuditLogResponse> getAllLogs() {
        return auditLogService.getAllLogs();
    }
}
