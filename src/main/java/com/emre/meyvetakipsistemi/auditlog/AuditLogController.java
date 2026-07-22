package com.emre.meyvetakipsistemi.auditlog;

import org.springframework.web.bind.annotation.*;

import java.util.List;

// Log kayıtlarını frontend veya test araçlarına açar.
@RestController
@RequestMapping("/api/audit-logs")
@CrossOrigin(origins = "http://localhost:8081")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    // Tüm log kayıtlarını getirir.
    @GetMapping
    public List<AuditLog> getAllLogs() {
        return auditLogService.getAllLogs();
    }
}